
import {
    DEFAULT_REQUEST_RETRIES,
    DEFAULT_TIMEOUT_SECONDS,
    REQUEST_RETRY_BACKOFF_BASE_MS,
} from '@/constants/app-config';

export interface JackettServerConfig {
    appVersion: string;
    basepathoverride?: string;
    [key: string]: unknown;
}

export interface JackettIndexer {
    id: string;
    name: string;
    description?: string;
    type?: string;
    language?: string;
    lastUpdated?: string;
    results?: number;
    configured?: boolean;
}

export interface JackettSearchResult {
    Tracker: string;
    TrackerId: string;
    Title: string;
    Guid: string;
    
    Link: string;
    
    Details: string;
    Date?: string;
    Size?: number;
    Seeders?: number;
    Leechers?: number;
    Grabs?: number;
    MagnetUri?: string;
    InfoHash?: string;
    CategoryDesc?: string;
    DownloadVolumeFactor?: number;
    UploadVolumeFactor?: number;
}

export interface JackettSearchResponse {
    Results: JackettSearchResult[];
    Total?: number;
}

export interface SearchOptions {
    query: string;
    
    trackers?: string[];
    
    categories?: string[];
    limit?: number;
}

export class JackettError extends Error {
    
    readonly transient: boolean;
    
    readonly cancelled: boolean;

    constructor(message: string, transient = false, cancelled = false) {
        super(message);
        this.name = 'JackettError';
        this.transient = transient;
        this.cancelled = cancelled;
    }
}


export interface AuthOptions {
    username?: string;
    password?: string;
}


export interface NetworkOptions {
    
    timeoutMs?: number;
    
    retries?: number;
 
    signal?: AbortSignal;
}

export interface RequestConfig extends NetworkOptions {
    auth?: AuthOptions;
}

const TIMEOUT_MS = DEFAULT_TIMEOUT_SECONDS * 1_000;

export function normalizeBaseUrl(raw: string): string {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
    return trimmed;
}

function buildUrl(baseUrl: string, path: string): URL {
    const url = new URL(normalizeBaseUrl(baseUrl));
    const basePath = url.pathname.replace(/\/+$/, '');
    url.pathname = `${basePath}${path}`;
    return url;
}

function base64Encode(input: string): string {
    if (typeof btoa === 'function') return btoa(input);
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code < 0x80) bytes.push(code);
        else if (code < 0x800)
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        else {
            bytes.push(
                0xe0 | (code >> 12),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f),
            );
        }
    }
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        out += chars[b0 >> 2];
        out += chars[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
        out +=
            b1 === undefined ? '=' : chars[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
        out += b2 === undefined ? '=' : chars[b2 & 63];
    }
    return out;
}

function buildHeaders(auth?: AuthOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    if (auth?.username) {
        headers.Authorization = `Basic ${base64Encode(`${auth.username}:${auth.password ?? ''}`)}`;
    }
    return headers;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
 
async function withRetry<T>(
    operation: () => Promise<T>,
    retries: number,
): Promise<T> {
    let attempt = 0;
    for (;;) {
        try {
            return await operation();
        } catch (error) {
            const isTransient =
                error instanceof JackettError &&
                error.transient &&
                !error.cancelled;
            if (!isTransient || attempt >= retries) throw error;
            await delay(REQUEST_RETRY_BACKOFF_BASE_MS * 2 ** attempt);
            attempt += 1;
        }
    }
}

async function requestOnce<T>(
    baseUrl: string,
    apiKey: string,
    path: string,
    params: Record<string, string | string[]>,
    auth: AuthOptions | undefined,
    timeoutMs: number,
    signal: AbortSignal | undefined,
): Promise<T> {
    
    if (signal?.aborted) {
        throw new JackettError('Requisição cancelada.', false, true);
    }

    const url = buildUrl(baseUrl, path);
    url.searchParams.set('apikey', apiKey);
    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            
            for (const item of value) url.searchParams.append(`${key}[]`, item);
        } else if (value) {
            url.searchParams.set(key, value);
        }
    }

    
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener('abort', onExternalAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: buildHeaders(auth),
        });
        
        
        
        
        const contentType = (
            response.headers.get('content-type') ?? ''
        ).toLowerCase();
        const redirected = !response.url.startsWith(url.origin + url.pathname);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                
                throw new JackettError(
                    'Acesso não autorizado (HTTP ' +
                        `${response.status}). Verifique a API key e, se o servidor/proxy exigir ` +
                        'autenticação básica, preencha usuário e senha nas configurações.',
                );
            }
            if (redirected && !contentType.includes('json')) {
                
                throw new JackettError(
                    'A requisição foi redirecionada para a página de login do Jackett ' +
                        `(terminou em HTTP ${response.status}). Isso indica que a API key está ` +
                        'inválida ou foi regenerada no servidor. Confira a key na UI do Jackett ' +
                        '(ou no ServerConfig.json do container).',
                );
            }
            
            const transient = response.status === 429 || response.status >= 500;
            throw new JackettError(
                `O servidor respondeu com erro HTTP ${response.status}.`,
                transient,
            );
        }

        if (!contentType.includes('json')) {
            throw new JackettError(
                redirected
                    ? 'O servidor redirecionou para a página de login do Jackett. ' +
                          'Isso indica que a API key está inválida ou foi regenerada no servidor. ' +
                          'Confira a key na UI do Jackett (ou no ServerConfig.json do container).'
                    : `O servidor respondeu com conteúdo inesperado ` +
                          `(Content-Type: ${contentType || 'ausente'}), esperava-se JSON.`,
            );
        }
        try {
            return (await response.json()) as T;
        } catch {
            throw new JackettError(
                'A resposta do servidor não é um JSON válido. Verifique se a URL aponta ' +
                    'para o Jackett (e não para outro serviço no mesmo domínio).',
            );
        }
    } catch (error) {
        if (error instanceof JackettError) throw error;
        
        if (signal?.aborted) {
            throw new JackettError('Requisição cancelada.', false, true);
        }
        if (error instanceof Error && error.name === 'AbortError') {
            throw new JackettError(
                'Tempo limite excedido ao conectar ao servidor.',
                true,
            );
        }
        throw new JackettError(
            'Não foi possível conectar ao servidor. Verifique a URL e sua conexão.',
            true,
        );
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onExternalAbort);
    }
}

async function request<T>(
    baseUrl: string,
    apiKey: string,
    path: string,
    params: Record<string, string | string[]>,
    config?: RequestConfig,
): Promise<T> {
    const timeoutMs = config?.timeoutMs ?? TIMEOUT_MS;
    const retries = config?.retries ?? DEFAULT_REQUEST_RETRIES;
    return withRetry(
        () =>
            requestOnce<T>(
                baseUrl,
                apiKey,
                path,
                params,
                config?.auth,
                timeoutMs,
                config?.signal,
            ),
        retries,
    );
}

export async function getServerConfig(
    baseUrl: string,
    apiKey: string,
    config?: RequestConfig,
): Promise<JackettServerConfig> {
    return request<JackettServerConfig>(
        baseUrl,
        apiKey,
        '/api/v2.0/server/config',
        {},
        config,
    );
}

export interface JackettHealth {
    status: string;
}

export async function getHealth(
    baseUrl: string,
    config?: RequestConfig,
): Promise<JackettHealth> {
    const timeoutMs = config?.timeoutMs ?? TIMEOUT_MS;
    const retries = config?.retries ?? DEFAULT_REQUEST_RETRIES;
    return withRetry(async () => {
        if (config?.signal?.aborted) {
            throw new JackettError('Teste cancelado.', false, true);
        }
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        config?.signal?.addEventListener('abort', onExternalAbort);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(
                buildUrl(baseUrl, '/health').toString(),
                {
                    signal: controller.signal,
                    headers: buildHeaders(config?.auth),
                },
            );
            if (!response.ok) {
                const transient =
                    response.status === 429 || response.status >= 500;
                throw new JackettError(
                    `O servidor respondeu com erro HTTP ${response.status} em /health.`,
                    transient,
                );
            }
            try {
                return (await response.json()) as JackettHealth;
            } catch {
                throw new JackettError(
                    'O endpoint /health não retornou um JSON válido. Verifique se a URL ' +
                        'aponta para o Jackett (e não para outro serviço no mesmo domínio).',
                );
            }
        } catch (error) {
            if (error instanceof JackettError) throw error;
            if (config?.signal?.aborted) {
                throw new JackettError('Teste cancelado.', false, true);
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new JackettError(
                    'Tempo limite excedido ao contatar o servidor.',
                    true,
                );
            }
            throw new JackettError(
                'Não foi possível conectar ao servidor. Verifique a URL e sua conexão.',
                true,
            );
        } finally {
            clearTimeout(timer);
            config?.signal?.removeEventListener('abort', onExternalAbort);
        }
    }, retries);
}

export async function pingServer(
    baseUrl: string,
    config?: RequestConfig,
): Promise<{ status: number }> {
    const timeoutMs = config?.timeoutMs ?? TIMEOUT_MS;
    const retries = config?.retries ?? DEFAULT_REQUEST_RETRIES;
    return withRetry(async () => {
        if (config?.signal?.aborted) {
            throw new JackettError('Teste cancelado.', false, true);
        }
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        config?.signal?.addEventListener('abort', onExternalAbort);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(normalizeBaseUrl(baseUrl), {
                method: 'GET',
                signal: controller.signal,
                headers: buildHeaders(config?.auth),
            });
            return { status: response.status };
        } catch (error) {
            if (config?.signal?.aborted) {
                throw new JackettError('Teste cancelado.', false, true);
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new JackettError(
                    'Tempo limite excedido ao contatar a VPS.',
                    true,
                );
            }
            throw new JackettError(
                'Não foi possível alcançar a VPS. Verifique o endereço/domínio e sua conexão.',
                true,
            );
        } finally {
            clearTimeout(timer);
            config?.signal?.removeEventListener('abort', onExternalAbort);
        }
    }, retries);
}

export async function getIndexers(
    baseUrl: string,
    apiKey: string,
    config?: RequestConfig,
): Promise<JackettIndexer[]> {
    const data = await request<JackettIndexer[]>(
        baseUrl,
        apiKey,
        '/api/v2.0/indexers',
        { configured: 'true' },
        config,
    );
    return Array.isArray(data) ? data : [];
}

export async function searchResults(
    baseUrl: string,
    apiKey: string,
    options: SearchOptions,
    config?: RequestConfig,
): Promise<JackettSearchResponse> {
    const params: Record<string, string | string[]> = {
        Query: options.query,
        limit: String(options.limit ?? 100),
    };
    if (options.trackers?.length) params.Tracker = options.trackers;
    if (options.categories?.length) params.Category = options.categories;

    return request<JackettSearchResponse>(
        baseUrl,
        apiKey,
        '/api/v2.0/indexers/all/results',
        params,
        config,
    );
}
