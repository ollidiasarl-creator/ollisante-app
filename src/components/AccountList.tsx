import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** En-tête du compte : initiales, nom, profil (badge) et coordonnées, comme les comptes Doctolib et Qare. */
export function AccountHeader({ name, subtitle, badge, badgeTone = 'ok' }: {
  name: string;
  subtitle?: string | null;
  badge?: string;
  badgeTone?: 'ok' | 'wait';
}) {
  const initials = name
    .split(/\s+/)
    .filter((w) => w && !/^dr\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials || '?'}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={type.h2} numberOfLines={1}>{name}</Text>
        {subtitle ? <Text style={type.small} numberOfLines={1}>{subtitle}</Text> : null}
        {badge ? (
          <View style={[styles.badge, badgeTone === 'wait' && styles.badgeWait]}>
            <Text style={[styles.badgeText, badgeTone === 'wait' && styles.badgeTextWait]}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Groupe de lignes avec un petit titre (« Mon compte », « Aide »…). */
export function AccountSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** Ligne d'une section : icône, libellé, valeur facultative, flèche si elle mène quelque part. */
export function AccountRow({ icon, label, value, onPress, danger, right, last }: {
  icon: IconName;
  label: string;
  value?: string | null;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  last?: boolean;
}) {
  const tint = danger ? colors.orange : colors.green;
  const content = (
    <>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, danger && { color: colors.orange }]}>{label}</Text>
        {value ? <Text style={type.small} numberOfLines={2}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </>
  );
  const rowStyle = [styles.row, !last && styles.rowBorder];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.white, fontSize: 24, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
  },
  badgeWait: { backgroundColor: colors.orangeSoft },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.green },
  badgeTextWait: { color: colors.orange },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: colors.orangeSoft },
  rowLabel: { fontSize: 16, fontWeight: '600', color: colors.navy },
  pressed: { backgroundColor: '#F6F8F7' },
});
