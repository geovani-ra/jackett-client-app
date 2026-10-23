import { Platform } from 'react-native';

export const Colors = {
    light: {
        text: '#000000',
        background: '#ffffff',
        backgroundElement: '#F0F0F3',
        backgroundSelected: '#D7D9DF',
        textSecondary: '#4A4E56',
    },
    dark: {
        text: '#ffffff',
        background: '#000000',
        backgroundElement: '#212225',
        backgroundSelected: '#3A3E45',
        textSecondary: '#C2C6CC',
    },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
    ios: {
        /** iOS `UIFontDescriptorSystemDesignDefault` */
        sans: 'system-ui',
        /** iOS `UIFontDescriptorSystemDesignSerif` */
        serif: 'ui-serif',
        /** iOS `UIFontDescriptorSystemDesignRounded` */
        rounded: 'ui-rounded',
        /** iOS `UIFontDescriptorSystemDesignMonospaced` */
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: 'var(--font-display)',
        serif: 'var(--font-serif)',
        rounded: 'var(--font-rounded)',
        mono: 'var(--font-mono)',
    },
});

export const Spacing = {
    half: 2,
    one: 4,
    two: 8,
    three: 16,
    four: 24,
    five: 32,
    six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export interface TorrentClientRecommendation {
    name: string;
    androidPackageId: string;
    playStoreUrl: string;
}

export const RECOMMENDED_TORRENT_CLIENT: TorrentClientRecommendation = {
    name: 'Flud',
    androidPackageId: 'com.delphicoder.flud',
    playStoreUrl:
        'https://play.google.com/store/apps/details?id=com.delphicoder.flud',
};

export type ResultSortOrder = 'seeders' | 'leechers' | 'date' | 'size';

export const DEFAULT_RESULT_SORT: ResultSortOrder = 'seeders';

export const RESULT_SORT_OPTIONS: { id: ResultSortOrder; label: string }[] = [
    { id: 'seeders', label: 'Seeders (mais primeiro)' },
    { id: 'leechers', label: 'Leechers (mais primeiro)' },
    { id: 'date', label: 'Data (mais recentes)' },
    { id: 'size', label: 'Tamanho (maiores primeiro)' },
];

export function isResultSortOrder(value: unknown): value is ResultSortOrder {
    return (
        typeof value === 'string' &&
        RESULT_SORT_OPTIONS.some((option) => option.id === value)
    );
}

export const DEFAULT_TIMEOUT_SECONDS = 60;

export const TIMEOUT_SECONDS_MIN = 5;
export const TIMEOUT_SECONDS_MAX = 300;

export const DEFAULT_REQUEST_RETRIES = 1;

export const REQUEST_RETRIES_MIN = 0;
export const REQUEST_RETRIES_MAX = 5;

export const REQUEST_RETRY_BACKOFF_BASE_MS = 1_000;

export const DEFAULT_SEARCH_HISTORY_LIMIT = 10;

export const SEARCH_HISTORY_LIMIT_MIN = 1;
export const SEARCH_HISTORY_LIMIT_MAX = 100;

export function clampValue(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.floor(value)));
}
