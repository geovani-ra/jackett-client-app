
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import {
    clampValue,
    DEFAULT_REQUEST_RETRIES,
    DEFAULT_RESULT_SORT,
    DEFAULT_SEARCH_HISTORY_LIMIT,
    DEFAULT_TIMEOUT_SECONDS,
    isResultSortOrder,
    REQUEST_RETRIES_MAX,
    REQUEST_RETRIES_MIN,
    SEARCH_HISTORY_LIMIT_MAX,
    SEARCH_HISTORY_LIMIT_MIN,
    TIMEOUT_SECONDS_MAX,
    TIMEOUT_SECONDS_MIN,
    type ResultSortOrder,
} from '@/constants/app-config';
import { normalizeBaseUrl } from '@/lib/jackett';

const STORAGE_KEY = 'jackett-settings-v1';

export interface Settings {
    baseUrl: string;
    apiKey: string;
    
    authUser?: string;
    
    authPassword?: string;
    
    searchHistoryLimit?: number;
    
    requestTimeoutSeconds?: number;
    
    requestRetries?: number;
    
    sortOrder?: ResultSortOrder;
}

interface SettingsContextValue {
    settings: Settings;
    ready: boolean;
    isConfigured: boolean;
    saveSettings: (next: Settings) => Promise<void>;
}

const EMPTY_SETTINGS: Settings = { baseUrl: '', apiKey: '' };

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (!cancelled && raw) {
                    const parsed = JSON.parse(raw) as Partial<Settings>;
                    setSettings({
                        baseUrl:
                            typeof parsed.baseUrl === 'string'
                                ? parsed.baseUrl
                                : '',
                        apiKey:
                            typeof parsed.apiKey === 'string'
                                ? parsed.apiKey
                                : '',
                        authUser:
                            typeof parsed.authUser === 'string'
                                ? parsed.authUser
                                : '',
                        authPassword:
                            typeof parsed.authPassword === 'string'
                                ? parsed.authPassword
                                : '',
                        searchHistoryLimit:
                            typeof parsed.searchHistoryLimit === 'number' &&
                            Number.isFinite(parsed.searchHistoryLimit)
                                ? clampValue(
                                      parsed.searchHistoryLimit,
                                      SEARCH_HISTORY_LIMIT_MIN,
                                      SEARCH_HISTORY_LIMIT_MAX,
                                  )
                                : DEFAULT_SEARCH_HISTORY_LIMIT,
                        requestTimeoutSeconds:
                            typeof parsed.requestTimeoutSeconds === 'number' &&
                            Number.isFinite(parsed.requestTimeoutSeconds)
                                ? clampValue(
                                      parsed.requestTimeoutSeconds,
                                      TIMEOUT_SECONDS_MIN,
                                      TIMEOUT_SECONDS_MAX,
                                  )
                                : DEFAULT_TIMEOUT_SECONDS,
                        requestRetries:
                            typeof parsed.requestRetries === 'number' &&
                            Number.isFinite(parsed.requestRetries)
                                ? clampValue(
                                      parsed.requestRetries,
                                      REQUEST_RETRIES_MIN,
                                      REQUEST_RETRIES_MAX,
                                  )
                                : DEFAULT_REQUEST_RETRIES,
                        sortOrder: isResultSortOrder(parsed.sortOrder)
                            ? parsed.sortOrder
                            : DEFAULT_RESULT_SORT,
                    });
                }
            } catch {
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const saveSettings = async (next: Settings) => {
        const normalized: Settings = {
            baseUrl: normalizeBaseUrl(next.baseUrl),
            apiKey: next.apiKey.trim(),
            authUser: next.authUser?.trim() ?? '',
            authPassword: next.authPassword ?? '',
            searchHistoryLimit:
                typeof next.searchHistoryLimit === 'number' &&
                Number.isFinite(next.searchHistoryLimit)
                    ? clampValue(
                          next.searchHistoryLimit,
                          SEARCH_HISTORY_LIMIT_MIN,
                          SEARCH_HISTORY_LIMIT_MAX,
                      )
                    : DEFAULT_SEARCH_HISTORY_LIMIT,
            requestTimeoutSeconds:
                typeof next.requestTimeoutSeconds === 'number' &&
                Number.isFinite(next.requestTimeoutSeconds)
                    ? clampValue(
                          next.requestTimeoutSeconds,
                          TIMEOUT_SECONDS_MIN,
                          TIMEOUT_SECONDS_MAX,
                      )
                    : DEFAULT_TIMEOUT_SECONDS,
            requestRetries:
                typeof next.requestRetries === 'number' &&
                Number.isFinite(next.requestRetries)
                    ? clampValue(
                          next.requestRetries,
                          REQUEST_RETRIES_MIN,
                          REQUEST_RETRIES_MAX,
                      )
                    : DEFAULT_REQUEST_RETRIES,
            sortOrder: isResultSortOrder(next.sortOrder)
                ? next.sortOrder
                : DEFAULT_RESULT_SORT,
        };
        setSettings(normalized);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    };

    const value = useMemo<SettingsContextValue>(
        () => ({
            settings,
            ready,
            isConfigured: Boolean(settings.baseUrl && settings.apiKey),
            saveSettings,
        }),
        [settings, ready],
    );

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings(): SettingsContextValue {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error(
            'useSettings deve ser usado dentro de SettingsProvider.',
        );
    }
    return context;
}
