
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'jackett-search-history-v1';

export async function loadSearchHistory(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
    } catch {
        return [];
    }
}

export async function addSearchToHistory(
    query: string,
    limit: number,
): Promise<string[]> {
    const trimmed = query.trim();
    if (!trimmed) return loadSearchHistory();
    const current = await loadSearchHistory();
    const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(
        0,
        Math.max(1, limit),
    );
    try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
    }
    return next;
}

export async function clearSearchHistory(): Promise<void> {
    try {
        await AsyncStorage.removeItem(HISTORY_KEY);
    } catch {
    }
}
