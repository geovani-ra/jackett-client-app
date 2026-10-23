import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

    return (
        <NativeTabs
            backgroundColor={colors.background}
            indicatorColor={colors.backgroundSelected}
            
            labelStyle={{
                default: { color: colors.textSecondary },
                selected: { color: colors.text },
            }}
            iconColor={{
                default: colors.textSecondary,
                selected: colors.text,
            }}
        >
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Busca</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="search" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Label>
                    Configurações
                </NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="settings" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
