import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { onOfflineChange } from '../lib/offline';
import { colors, spacing } from '../theme';

/** Bandeau discret en bas de l'écran quand l'application affiche des informations enregistrées, faute de réseau. */
export function OfflineBanner() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  useEffect(() => onOfflineChange(setOffline), []);
  if (!offline) return null;
  return (
    <View pointerEvents="none" accessibilityRole="alert" style={[styles.bar, { bottom: insets.bottom + 64 }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <Text style={styles.text}>{t('offline.banner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.navy,
    opacity: 0.94,
  },
  text: { flex: 1, color: colors.white, fontSize: 13, lineHeight: 18 },
});
