import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { Select } from '@/components/select';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    DEFAULT_REQUEST_RETRIES,
    DEFAULT_RESULT_SORT,
    DEFAULT_SEARCH_HISTORY_LIMIT,
    DEFAULT_TIMEOUT_SECONDS,
    RECOMMENDED_TORRENT_CLIENT,
    RESULT_SORT_OPTIONS,
    type ResultSortOrder,
} from '@/constants/app-config';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getHealth, JackettError } from '@/lib/jackett';
import { useSettings } from '@/lib/settings';

export default function SettingsScreen() {
    const { settings, ready, saveSettings } = useSettings();
    const theme = useTheme();

    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [authUser, setAuthUser] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [historyLimit, setHistoryLimit] = useState(
        String(DEFAULT_SEARCH_HISTORY_LIMIT),
    );
    const [timeoutSeconds, setTimeoutSeconds] = useState(
        String(DEFAULT_TIMEOUT_SECONDS),
    );
    const [retries, setRetries] = useState(String(DEFAULT_REQUEST_RETRIES));
    const [sortOrder, setSortOrder] =
        useState<ResultSortOrder>(DEFAULT_RESULT_SORT);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [status, setStatus] = useState<{
        ok: boolean;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (ready) {
            setBaseUrl(settings.baseUrl);
            setApiKey(settings.apiKey);
            setAuthUser(settings.authUser ?? '');
            setAuthPassword(settings.authPassword ?? '');
            setHistoryLimit(
                String(
                    settings.searchHistoryLimit ?? DEFAULT_SEARCH_HISTORY_LIMIT,
                ),
            );
            setTimeoutSeconds(
                String(
                    settings.requestTimeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
                ),
            );
            setRetries(
                String(settings.requestRetries ?? DEFAULT_REQUEST_RETRIES),
            );
            setSortOrder(settings.sortOrder ?? DEFAULT_RESULT_SORT);
        }
    }, [ready]);

    const handleSave = async () => {
        if (!baseUrl.trim() || !apiKey.trim()) {
            setStatus({ ok: false, message: 'Preencha a URL e a API key.' });
            return;
        }
        const parsedLimit = Number.parseInt(historyLimit, 10);
        const parsedTimeout = Number.parseInt(timeoutSeconds, 10);
        const parsedRetries = Number.parseInt(retries, 10);
        setSaving(true);
        try {
            await saveSettings({
                baseUrl,
                apiKey,
                authUser,
                authPassword,
                searchHistoryLimit: Number.isFinite(parsedLimit)
                    ? parsedLimit
                    : DEFAULT_SEARCH_HISTORY_LIMIT,
                requestTimeoutSeconds: Number.isFinite(parsedTimeout)
                    ? parsedTimeout
                    : DEFAULT_TIMEOUT_SECONDS,
                requestRetries: Number.isFinite(parsedRetries)
                    ? parsedRetries
                    : DEFAULT_REQUEST_RETRIES,
                sortOrder,
            });
            setStatus({ ok: true, message: 'Configurações salvas.' });
        } catch {
            setStatus({
                ok: false,
                message: 'Não foi possível salvar as configurações.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!baseUrl.trim()) {
            setStatus({
                ok: false,
                message: 'Preencha a URL antes de testar.',
            });
            return;
        }
        setTesting(true);
        setStatus(null);
        try {
            const networkConfig = {
                auth: {
                    username: authUser.trim() || undefined,
                    password: authPassword || undefined,
                },
                timeoutMs:
                    (settings.requestTimeoutSeconds ??
                        DEFAULT_TIMEOUT_SECONDS) * 1_000,
                retries: settings.requestRetries ?? DEFAULT_REQUEST_RETRIES,
            };

            const health = await getHealth(baseUrl, networkConfig);
            setStatus({
                ok: true,
                message: `Conexão OK! Jackett respondeu em /health com status "${health.status}".`,
            });
        } catch (err) {
            setStatus({
                ok: false,
                message:
                    err instanceof JackettError
                        ? err.message
                        : 'Erro inesperado ao testar conexão.',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <ThemedText type="subtitle">Configurações</ThemedText>

                        <ThemedView
                            type="backgroundElement"
                            style={styles.formCard}
                        >
                            <ThemedText type="smallBold">
                                URL do servidor Jackett
                            </ThemedText>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="https://jackett.seudominio.com"
                                placeholderTextColor="#888"
                                value={baseUrl}
                                onChangeText={setBaseUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                                Aceita HTTPS (443) e subdiretórios, ex.:
                                https://dominio.com/jackett
                            </ThemedText>

                            <ThemedText type="smallBold">API Key</ThemedText>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="API key do Jackett"
                                placeholderTextColor="#888"
                                value={apiKey}
                                onChangeText={setApiKey}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                                A API key aparece em “Jackett API Key” no painel
                                do Jackett.
                            </ThemedText>

                            <ThemedText type="smallBold">
                                Autenticação básica (opcional)
                            </ThemedText>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Usuário (se o nginx exigir)"
                                placeholderTextColor="#888"
                                value={authUser}
                                onChangeText={setAuthUser}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Senha (se o nginx exigir)"
                                placeholderTextColor="#888"
                                value={authPassword}
                                onChangeText={setAuthPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                                Preencha apenas se o seu nginx (ou outro proxy)
                                exigir HTTP Basic Auth na frente do Jackett. A
                                admin password do próprio Jackett não é
                                necessária aqui: a API autentica somente com a
                                API key.
                            </ThemedText>

                            <ThemedText type="smallBold">
                                Histórico de buscas
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.historyInput,
                                    { color: theme.text },
                                ]}
                                placeholder={String(
                                    DEFAULT_SEARCH_HISTORY_LIMIT,
                                )}
                                placeholderTextColor="#888"
                                value={historyLimit}
                                onChangeText={(text) =>
                                    setHistoryLimit(text.replace(/[^0-9]/g, ''))
                                }
                                keyboardType="number-pad"
                                maxLength={3}
                                textAlign="center"
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                                Quantidade de buscas recentes mantidas no
                                histórico (padrão:{' '}
                                {DEFAULT_SEARCH_HISTORY_LIMIT}).
                            </ThemedText>

                            <ThemedText type="smallBold">Rede</ThemedText>
                            <View style={styles.networkRow}>
                                <View style={styles.networkField}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.smallInput,
                                            { color: theme.text },
                                        ]}
                                        placeholder={String(
                                            DEFAULT_TIMEOUT_SECONDS,
                                        )}
                                        placeholderTextColor="#888"
                                        value={timeoutSeconds}
                                        onChangeText={(text) =>
                                            setTimeoutSeconds(
                                                text.replace(/[^0-9]/g, ''),
                                            )
                                        }
                                        keyboardType="number-pad"
                                        maxLength={3}
                                        textAlign="center"
                                    />
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary"
                                    >
                                        Timeout (s)
                                    </ThemedText>
                                </View>
                                <View style={styles.networkField}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.smallInput,
                                            { color: theme.text },
                                        ]}
                                        placeholder={String(
                                            DEFAULT_REQUEST_RETRIES,
                                        )}
                                        placeholderTextColor="#888"
                                        value={retries}
                                        onChangeText={(text) =>
                                            setRetries(
                                                text.replace(/[^0-9]/g, ''),
                                            )
                                        }
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        textAlign="center"
                                    />
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary"
                                    >
                                        Retentativas
                                    </ThemedText>
                                </View>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary">
                                Timeout padrão de {DEFAULT_TIMEOUT_SECONDS}s por
                                requisição e {DEFAULT_REQUEST_RETRIES} tentativa
                                extra automática para erros transitórios (rede,
                                timeout, HTTP 429/5xx), com backoff exponencial.
                                Aplicam-se após salvar.
                            </ThemedText>

                            <ThemedText type="smallBold">
                                Ordenação dos resultados
                            </ThemedText>
                            <Select
                                value={sortOrder}
                                options={RESULT_SORT_OPTIONS.map((option) => ({
                                    value: option.id,
                                    label: option.label,
                                }))}
                                onSelect={(value) =>
                                    setSortOrder(value as ResultSortOrder)
                                }
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                                Critério usado para ordenar a lista de
                                resultados da busca (padrão: Seeders).
                            </ThemedText>

                            <View style={styles.buttonsRow}>
                                <Pressable
                                    style={[
                                        styles.button,
                                        styles.primaryButton,
                                    ]}
                                    onPress={() => void handleSave()}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.background}
                                        />
                                    ) : (
                                        <ThemedText
                                            type="smallBold"
                                            themeColor="background"
                                        >
                                            Salvar
                                        </ThemedText>
                                    )}
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.button,
                                        {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}
                                    onPress={() => void handleTestConnection()}
                                    disabled={testing}
                                >
                                    {testing ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.text}
                                        />
                                    ) : (
                                        <ThemedText type="smallBold">
                                            Testar conexão
                                        </ThemedText>
                                    )}
                                </Pressable>
                            </View>

                            {status && (
                                <ThemedText
                                    type="small"
                                    style={{
                                        color: status.ok
                                            ? '#2E7D32'
                                            : '#C62828',
                                    }}
                                >
                                    {status.message}
                                </ThemedText>
                            )}
                        </ThemedView>

                        <ThemedView
                            type="backgroundElement"
                            style={styles.hintCard}
                        >
                            <ThemedText type="smallBold">Dicas</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                                {
                                    '• "Testar conexão" consulta o endpoint /health do Jackett (sem autenticação).'
                                }
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                                {
                                    '• Para abrir magnets no Android, instale o cliente '
                                }
                                <ExternalLink
                                    href={
                                        RECOMMENDED_TORRENT_CLIENT.playStoreUrl
                                    }
                                >
                                    <ThemedText type="link">
                                        {RECOMMENDED_TORRENT_CLIENT.name}
                                    </ThemedText>
                                </ExternalLink>
                                .
                            </ThemedText>
                        </ThemedView>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.three,
    },
    scrollContent: {
        gap: Spacing.three,

        paddingBottom: BottomTabInset,
    },
    formCard: {
        borderRadius: Spacing.two,
        padding: Spacing.three,
        gap: Spacing.two,
    },
    hintCard: {
        borderRadius: Spacing.two,
        padding: Spacing.three,
        gap: Spacing.one,
    },
    input: {
        backgroundColor: 'rgba(128,128,128,0.15)',
        borderRadius: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + 4,
        fontSize: 16,
    },
    historyInput: {
        width: 80,
        alignSelf: 'flex-start',
        textAlign: 'center',
    },
    networkRow: {
        flexDirection: 'row',
        gap: Spacing.three,
    },
    networkField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    smallInput: {
        width: 70,
        paddingVertical: Spacing.two,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    button: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.three - 4,
        borderRadius: Spacing.two,
    },
    primaryButton: {
        backgroundColor: '#3c87f7',
    },
});
