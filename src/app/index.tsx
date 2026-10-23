import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultCard } from '@/components/result-card';
import { Select } from '@/components/select';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    DEFAULT_REQUEST_RETRIES,
    DEFAULT_RESULT_SORT,
    DEFAULT_TIMEOUT_SECONDS,
} from '@/constants/app-config';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES } from '@/lib/format';
import {
    getIndexers,
    JackettError,
    searchResults,
    type JackettIndexer,
    type JackettSearchResult,
    type RequestConfig,
} from '@/lib/jackett';
import {
    addSearchToHistory,
    clearSearchHistory,
    loadSearchHistory,
} from '@/lib/search-history';
import { useSettings } from '@/lib/settings';

export default function SearchScreen() {
    const { settings, ready, isConfigured } = useSettings();
    const theme = useTheme();

    const requestConfig: RequestConfig = useMemo(
        () => ({
            auth: settings.authUser
                ? {
                      username: settings.authUser,
                      password: settings.authPassword,
                  }
                : undefined,
            timeoutMs:
                (settings.requestTimeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) *
                1_000,
            retries: settings.requestRetries ?? DEFAULT_REQUEST_RETRIES,
        }),
        [
            settings.authUser,
            settings.authPassword,
            settings.requestTimeoutSeconds,
            settings.requestRetries,
        ],
    );

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [trackers, setTrackers] = useState<JackettIndexer[]>([]);
    const [selectedTracker, setSelectedTracker] = useState('');
    const [results, setResults] = useState<JackettSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    const searchAbortRef = useRef<AbortController | null>(null);

    const historyLimit = settings.searchHistoryLimit ?? 10;

    const sortOrder = settings.sortOrder ?? DEFAULT_RESULT_SORT;

    const sortedResults = useMemo(() => {
        const list = [...results];
        switch (sortOrder) {
            case 'leechers':
                list.sort((a, b) => (b.Leechers ?? -1) - (a.Leechers ?? -1));
                break;
            case 'size':
                list.sort((a, b) => (b.Size ?? -1) - (a.Size ?? -1));
                break;
            case 'date':
                list.sort(
                    (a, b) =>
                        (b.Date
                            ? new Date(b.Date).getTime()
                            : Number.NEGATIVE_INFINITY) -
                        (a.Date
                            ? new Date(a.Date).getTime()
                            : Number.NEGATIVE_INFINITY),
                );
                break;
            default:
                list.sort((a, b) => (b.Seeders ?? -1) - (a.Seeders ?? -1));
        }
        return list;
    }, [results, sortOrder]);

    useEffect(() => () => searchAbortRef.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;
        loadSearchHistory().then((items) => {
            if (!cancelled) setHistory(items);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            return;
        }
        let cancelled = false;
        getIndexers(settings.baseUrl, settings.apiKey, requestConfig)
            .then((list) => {
                if (!cancelled) setTrackers(list);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isConfigured, settings.baseUrl, settings.apiKey, requestConfig]);

    const runSearch = useCallback(
        async (rawQuery?: string) => {
            const trimmed = (rawQuery ?? query).trim();
            if (!trimmed) return;
            searchAbortRef.current?.abort();
            const controller = new AbortController();
            searchAbortRef.current = controller;
            setLoading(true);
            setError(null);
            try {
                const response = await searchResults(
                    settings.baseUrl,
                    settings.apiKey,
                    {
                        query: trimmed,
                        trackers: selectedTracker
                            ? [selectedTracker]
                            : undefined,
                        categories: category ? [category] : undefined,
                        limit: 100,
                    },
                    { ...requestConfig, signal: controller.signal },
                );
                if (controller.signal.aborted) return;
                setResults(response.Results ?? []);
                setSearched(true);
                addSearchToHistory(trimmed, historyLimit).then(setHistory);
            } catch (err) {
                if (
                    controller.signal.aborted ||
                    (err instanceof JackettError && err.cancelled)
                )
                    return;
                setResults([]);
                setSearched(true);
                setError(
                    err instanceof JackettError
                        ? err.message
                        : 'Erro inesperado durante a busca.',
                );
            } finally {
                if (searchAbortRef.current === controller) {
                    searchAbortRef.current = null;
                    setLoading(false);
                }
            }
        },
        [
            query,
            category,
            selectedTracker,
            settings.baseUrl,
            settings.apiKey,
            requestConfig,
            historyLimit,
        ],
    );

    const handleReset = useCallback(() => {
        searchAbortRef.current?.abort();
        setResults([]);
        setError(null);
        setSearched(false);
        setQuery('');
    }, []);

    const handleCancelSearch = useCallback(() => {
        searchAbortRef.current?.abort();
    }, []);

    const handleClearHistory = useCallback(() => {
        clearSearchHistory().then(() => setHistory([]));
    }, []);

    if (ready && !isConfigured) {
        return (
            <ThemedView style={styles.centerContainer}>
                <SafeAreaView style={styles.centerContent}>
                    <ThemedText type="subtitle">
                        Configure o servidor
                    </ThemedText>
                    <ThemedText
                        type="default"
                        themeColor="textSecondary"
                        style={styles.centerText}
                    >
                        Informe a URL e a API key do seu Jackett na aba
                        Configurações para começar a buscar.
                    </ThemedText>
                </SafeAreaView>
            </ThemedView>
        );
    }

    const showHistory = !loading && !searched && history.length > 0;
    const idleTop = !loading && !searched;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View
                    style={
                        idleTop
                            ? styles.topControlsCentered
                            : styles.topControls
                    }
                >
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Buscar torrents..."
                        placeholderTextColor="#888"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => void runSearch()}
                        returnKeyType="search"
                        autoCorrect={false}
                        textAlign="center"
                    />

                    <View style={styles.selectsRow}>
                        <View style={styles.selectWrapper}>
                            <Select
                                value={category}
                                options={[
                                    { value: '', label: 'Categoria: Todas' },
                                    ...CATEGORIES.filter((item) => item.id).map(
                                        (item) => ({
                                            value: item.id,
                                            label: item.label,
                                        }),
                                    ),
                                ]}
                                onSelect={setCategory}
                            />
                        </View>
                        {trackers.length > 0 && (
                            <View style={styles.selectWrapper}>
                                <Select
                                    value={selectedTracker}
                                    options={[
                                        { value: '', label: 'Tracker: Todos' },
                                        ...trackers.map((tracker) => ({
                                            value: tracker.id,
                                            label: tracker.name,
                                        })),
                                    ]}
                                    onSelect={setSelectedTracker}
                                />
                            </View>
                        )}
                    </View>
                </View>

                {(searched || loading) && (
                    <View style={styles.resultsHeader}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {loading
                                ? 'Buscando...'
                                : `${results.length} resultado${results.length === 1 ? '' : 's'}`}
                        </ThemedText>
                        {loading ? (
                            <Pressable
                                style={[
                                    styles.headerButton,
                                    {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
                                ]}
                                hitSlop={8}
                                onPress={handleCancelSearch}
                            >
                                <ThemedText
                                    type="smallBold"
                                    style={{ color: '#C62828' }}
                                >
                                    Cancelar
                                </ThemedText>
                            </Pressable>
                        ) : (
                            <Pressable
                                style={[
                                    styles.headerButton,
                                    {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
                                ]}
                                hitSlop={8}
                                onPress={handleReset}
                            >
                                <ThemedText
                                    type="smallBold"
                                    style={{ color: '#3c87f7' }}
                                >
                                    Limpar busca
                                </ThemedText>
                            </Pressable>
                        )}
                    </View>
                )}

                {loading && (
                    <ActivityIndicator style={styles.loading} size="large" />
                )}

                {showHistory && (
                    <ThemedView
                        type="backgroundElement"
                        style={styles.historyCard}
                    >
                        <View style={styles.historyHeader}>
                            <ThemedText type="smallBold">
                                Buscas recentes
                            </ThemedText>
                            <Pressable onPress={handleClearHistory} hitSlop={8}>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary"
                                >
                                    Limpar histórico
                                </ThemedText>
                            </Pressable>
                        </View>
                        <View style={styles.historyList}>
                            {history.map((item) => (
                                <Pressable
                                    key={item}
                                    style={[
                                        styles.historyItem,
                                        {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}
                                    onPress={() => {
                                        setQuery(item);
                                        void runSearch(item);
                                    }}
                                >
                                    <ThemedText type="small" numberOfLines={1}>
                                        {item}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>
                    </ThemedView>
                )}

                {error && (
                    <ThemedView
                        type="backgroundElement"
                        style={styles.messageCard}
                    >
                        <ThemedText type="small" style={styles.errorText}>
                            {error}
                        </ThemedText>
                    </ThemedView>
                )}

                {!loading && !error && searched && results.length === 0 && (
                    <ThemedView
                        type="backgroundElement"
                        style={styles.messageCard}
                    >
                        <ThemedText type="small" themeColor="textSecondary">
                            Nenhum resultado encontrado.
                        </ThemedText>
                    </ThemedView>
                )}

                {!loading && results.length > 0 && (
                    <FlatList
                        data={sortedResults}
                        keyExtractor={(item, index) => `${item.Guid}-${index}`}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => <ResultCard result={item} />}
                        ItemSeparatorComponent={() => (
                            <View style={styles.separator} />
                        )}
                    />
                )}
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.four,
    },
    centerText: {
        textAlign: 'center',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.three,
    },
    searchInput: {
        backgroundColor: 'rgba(128,128,128,0.15)',
        borderRadius: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        fontSize: 17,
        marginBottom: Spacing.two,
    },
    topControls: {},
    topControlsCentered: {
        flex: 1,
        justifyContent: 'center',
    },
    selectsRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    selectWrapper: {
        flex: 1,
        minWidth: 140,
    },
    headerButton: {
        paddingVertical: Spacing.two + 2,
        paddingHorizontal: Spacing.three,
        borderRadius: Spacing.five,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.half,
        marginBottom: Spacing.two,
    },
    historyCard: {
        borderRadius: Spacing.two,
        padding: Spacing.three,
        gap: Spacing.two,
        marginBottom: Spacing.two,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    historyItem: {
        borderRadius: Spacing.five,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one + 2,
        maxWidth: '100%',
    },
    loading: {
        marginVertical: Spacing.four,
    },
    messageCard: {
        borderRadius: Spacing.two,
        padding: Spacing.three,
        marginBottom: Spacing.two,
    },
    errorText: {
        color: '#C62828',
    },
    listContent: {
        gap: Spacing.two,
        paddingBottom: BottomTabInset + Spacing.one,
    },
    separator: {
        height: 0,
    },
});
