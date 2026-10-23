import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
    formatBytes,
    formatDate,
    formatSeeders,
    seederColor,
} from '@/lib/format';
import type { JackettSearchResult } from '@/lib/jackett';
import { useTheme } from '@/hooks/use-theme';

function getMagnetUri(result: JackettSearchResult): string | null {
    if (result.MagnetUri) return result.MagnetUri;
    if (result.InfoHash) {
        return `magnet:?xt=urn:btih:${result.InfoHash}&dn=${encodeURIComponent(result.Title)}`;
    }
    return null;
}

async function openMagnet(result: JackettSearchResult) {
    const magnet = getMagnetUri(result);
    const url = magnet ?? result.Link;
    if (!url) {
        Alert.alert(
            'Magnet indisponível',
            'Este resultado não possui link magnet nem arquivo .torrent.',
        );
        return;
    }
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert(
            'Nenhum app de torrent',
            `Não foi possível abrir o ${magnet ? 'magnet' : 'arquivo .torrent'}. Instale um cliente de torrents (ex.: Flud, LibreTorrent).`,
        );
    }
}

async function openDetails(result: JackettSearchResult) {
    if (!result.Details) return;
    try {
        await Linking.openURL(result.Details);
    } catch {
        Alert.alert('Erro', 'Não foi possível abrir a página do torrent.');
    }
}

async function copyMagnet(result: JackettSearchResult) {
    const magnet = getMagnetUri(result);
    const url = magnet ?? result.Link;
    if (!url) {
        Alert.alert(
            'Nada para copiar',
            'Este resultado não possui link magnet nem arquivo .torrent.',
        );
        return;
    }
    await Clipboard.setStringAsync(url);
    Alert.alert(
        'Copiado',
        `${magnet ? 'Link magnet' : 'Link do .torrent'} copiado.`,
    );
}

export function ResultCard({ result }: { result: JackettSearchResult }) {
    const theme = useTheme();

    return (
        <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.title} numberOfLines={3}>
                {result.Title}
            </ThemedText>

            <View style={styles.metaRow}>
                <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.tracker}
                    numberOfLines={1}
                >
                    {result.Tracker}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    {formatBytes(result.Size)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(result.Date)}
                </ThemedText>
            </View>

            <View style={styles.metaRow}>
                <ThemedText
                    type="small"
                    style={{ color: seederColor(result.Seeders) }}
                >
                    ↑ {formatSeeders(result.Seeders)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    ↓ {result.Leechers ?? '?'}
                </ThemedText>
                {result.CategoryDesc ? (
                    <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        numberOfLines={1}
                    >
                        {result.CategoryDesc}
                    </ThemedText>
                ) : null}
            </View>

            <View style={styles.actionsRow}>
                <Pressable
                    style={[
                        styles.button,
                        { backgroundColor: theme.backgroundSelected },
                    ]}
                    onPress={() => void openMagnet(result)}
                >
                    <ThemedText type="smallBold">Magnet</ThemedText>
                </Pressable>
                <Pressable
                    style={[
                        styles.button,
                        { backgroundColor: theme.backgroundSelected },
                    ]}
                    onPress={() => void openDetails(result)}
                >
                    <ThemedText type="smallBold">Detalhes</ThemedText>
                </Pressable>
                <Pressable
                    style={[
                        styles.button,
                        { backgroundColor: theme.backgroundSelected },
                    ]}
                    onPress={() => void copyMagnet(result)}
                >
                    <ThemedText type="smallBold">Copiar</ThemedText>
                </Pressable>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: Spacing.two,
        padding: Spacing.three,
        gap: Spacing.two,
    },
    title: {
        flexShrink: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        flexWrap: 'wrap',
    },
    tracker: {
        flexShrink: 1,
        fontWeight: '700',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        marginTop: Spacing.half,
    },
    button: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: Spacing.two,
    },
});
