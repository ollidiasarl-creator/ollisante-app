import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lang, useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';

const LANGS: { code: Lang; flag: string; label: string; name: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
];

/** Choix de la langue avec drapeaux : page d'accueil (taille normale) et en-tête de chaque écran (compact). */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.switch} accessibilityRole="radiogroup">
      {LANGS.map(({ code, flag, label, name }) => {
        const selected = lang === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={name}
            hitSlop={4}
            onPress={() => setLang(code)}
            style={[styles.lang, compact && styles.langCompact, selected && styles.langOn]}
          >
            <Text style={compact ? styles.flagCompact : styles.flag}>{flag}</Text>
            {compact ? null : <Text style={[styles.langText, selected && styles.langTextOn]}>{label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  langCompact: { minHeight: 28, paddingHorizontal: spacing.sm },
  langOn: { backgroundColor: colors.green },
  flag: { fontSize: 16 },
  flagCompact: { fontSize: 15 },
  langText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  langTextOn: { color: colors.white },
});
