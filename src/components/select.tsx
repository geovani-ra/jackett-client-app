import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

export type SelectOption = { value: string; label: string };

type SelectProps = {
    value: string;

    options: SelectOption[];

    placeholder?: string;

    onSelect: (value: string) => void;
};

export function Select({
    value,
    options,
    placeholder = 'Selecionar',
    onSelect,
}: SelectProps) {
    const [open, setOpen] = useState(false);
    const current = options.find((option) => option.value === value);

    const close = () => setOpen(false);

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.trigger}
                onPress={() => setOpen(true)}
            >
                <ThemedText
                    type="small"
                    numberOfLines={1}
                    themeColor={current ? 'text' : 'textSecondary'}
                    style={styles.triggerLabel}
                >
                    {current?.label ?? placeholder}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    ▾
                </ThemedText>
            </Pressable>

            <Modal
                transparent
                visible={open}
                animationType="fade"
                onRequestClose={close}
            >
                {/* Fundo escurecido: tocar fora fecha o menu. */}
                <Pressable style={styles.backdrop} onPress={close}>
                    {/* Bloqueia a propagação do toque para o fundo. */}
                    <Pressable onPress={() => {}}>
                        <ThemedView
                            type="backgroundElement"
                            style={styles.menu}
                        >
                            <ScrollView
                                style={styles.menuScroll}
                                nestedScrollEnabled
                            >
                                {options.map((option) => {
                                    const selected = option.value === value;
                                    return (
                                        <Pressable
                                            key={option.value || '__default__'}
                                            style={({ pressed }) => [
                                                styles.option,
                                                selected &&
                                                    styles.optionSelected,
                                                pressed && styles.optionPressed,
                                            ]}
                                            onPress={() => {
                                                onSelect(option.value);
                                                close();
                                            }}
                                        >
                                            <ThemedText
                                                type={
                                                    selected
                                                        ? 'smallBold'
                                                        : 'small'
                                                }
                                                themeColor={
                                                    selected
                                                        ? 'text'
                                                        : 'textSecondary'
                                                }
                                            >
                                                {option.label}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </ThemedView>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.one,
        backgroundColor: 'rgba(128,128,128,0.15)',
        borderRadius: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + 2,
        minHeight: 40,
    },
    triggerLabel: {
        flexShrink: 1,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.four,
    },
    menu: {
        borderRadius: Spacing.two,
        minWidth: 240,
        maxWidth: 360,
        maxHeight: 380,
        overflow: 'hidden',
    },
    menuScroll: {
        flexGrow: 0,
    },
    option: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + 4,
    },
    optionSelected: {
        backgroundColor: 'rgba(128,128,128,0.18)',
    },
    optionPressed: {
        opacity: 0.7,
    },
});
