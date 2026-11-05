import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSlots, searchPractitioners } from '../api/endpoints';
import type { PractitionerSummary, Slot } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { addDays, formatMoney, formatTime, isoDate } from '../lib/format';
import { setPendingBooking } from '../lib/pendingBooking';
import { colors, radius, spacing } from '../theme';

const QUICK = [
  { code: '', fr: 'Tous', en: 'All' },
  { code: 'GENERAL_PRACTICE', fr: 'Généraliste', en: 'GP' },
  { code: 'PEDIATRICS', fr: 'Pédiatre', en: 'Pediatrician' },
  { code: 'GYNECOLOGY', fr: 'Gynécologue', en: 'Gynecologist' },
  { code: 'CARDIOLOGY', fr: 'Cardiologue', en: 'Cardiologist' },
  { code: 'DENTISTRY', fr: 'Dentiste', en: 'Dentist' },
];
const SHOWN = 6;
const SLOTS = 4;

type Row = { p: PractitionerSummary; slots: Slot[] };

/**
 * Accueil : les médecins qui ont des créneaux libres dans les prochains jours (les plus tôt d'abord), avec leurs
 * prochains horaires. Un visiteur qui touche un horaire se connecte puis arrive sur la confirmation.
 */
export function AvailableNow({ country, navigation }: { country: string | null; navigation: any }) {
  const { lang, locale } = useI18n();
  const fr = lang === 'fr';
  const guest = useAuth().status === 'signedOut';
  const [spec, setSpec] = useState('');
  const [loaded, setLoaded] = useState<{ key: string; rows: Row[] } | null>(null);
  const key = `${country ?? ''}|${spec}`;

  useEffect(() => {
    let live = true;
    const from = isoDate(new Date());
    const to = isoDate(addDays(new Date(), 13));
    searchPractitioners({ countryCode: country, specialty: spec || null, size: 12 })
      .then(async (page) => {
        const all = await Promise.all(
          page.content.map(async (p) => ({ p, slots: await getSlots(p.id, { from, to }).catch(() => [] as Slot[]) })),
        );
        const free = all.filter((r) => r.slots.length > 0);
        free.sort((a, b) => a.slots[0].startsAt.localeCompare(b.slots[0].startsAt));
        if (live) setLoaded({ key: `${country ?? ''}|${spec}`, rows: free.slice(0, SHOWN) });
      })
      .catch(() => live && setLoaded({ key: `${country ?? ''}|${spec}`, rows: [] }));
    return () => {
      live = false;
    };
  }, [country, spec]);

  const rows = loaded?.key === key ? loaded.rows : null;
  const dayName = (iso: string) => {
    const d = isoDate(new Date(iso));
    if (d === isoDate(new Date())) return fr ? 'Aujourd’hui' : 'Today';
    if (d === isoDate(addDays(new Date(), 1))) return fr ? 'Demain' : 'Tomorrow';
    return new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
  };
  const pick = (p: PractitionerSummary, s: Slot) => {
    if (guest) {
      setPendingBooking({ practitioner: p, slot: s });
      navigation.navigate('EmailLogin', { profile: 'patient', toBook: true });
    } else navigation.navigate('BookConfirm', { practitioner: p, slot: s });
  };
  const more = (p: PractitionerSummary) =>
    p.specialties[0] && navigation.navigate('BookAgenda', { countryCode: p.countryCode, specialty: p.specialties[0] });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{fr ? 'Médecins disponibles' : 'Available doctors'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {QUICK.map((q) => (
          <Pressable
            key={q.code}
            accessibilityRole="button"
            accessibilityState={{ selected: q.code === spec }}
            onPress={() => setSpec(q.code)}
            style={[styles.chip, q.code === spec && styles.chipOn]}
          >
            <Text style={[styles.chipText, q.code === spec && styles.chipTextOn]}>{fr ? q.fr : q.en}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {rows === null ? (
        <View style={[styles.card, styles.skeleton]} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>
          {fr ? 'Aucune disponibilité dans les prochains jours pour ce choix.' : 'No availability in the coming days for this choice.'}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {rows.map(({ p, slots }) => {
            const first = slots[0];
            const fee = p.consultationFeeMinor != null && p.feeCurrency ? formatMoney(p.consultationFeeMinor, p.feeCurrency, locale) : null;
            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.head}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>Dr {p.firstName} {p.lastName}</Text>
                    <Text style={styles.small} numberOfLines={1}>
                      {p.specialties.map((s) => (fr ? s.nameFr : s.nameEn)).join(', ')}
                      {fee ? ` · ${fee}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.nextRow}>
                  <View style={styles.dot} />
                  <Text style={styles.next} numberOfLines={1}>
                    {fr ? 'Prochain RDV : ' : 'Next: '}
                    <Text style={styles.nextStrong}>{dayName(first.startsAt).toLowerCase()} {fr ? 'à' : 'at'} {formatTime(first.startsAt, locale)}</Text>
                  </Text>
                </View>
                <View style={styles.slots}>
                  {slots.slice(0, SLOTS).map((s) => (
                    <Pressable
                      key={s.startsAt}
                      accessibilityRole="button"
                      accessibilityLabel={`${dayName(s.startsAt)} ${formatTime(s.startsAt, locale)}`}
                      onPress={() => pick(p, s)}
                      style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
                    >
                      <Text style={styles.slotDay} numberOfLines={1}>{dayName(s.startsAt)}</Text>
                      <Text style={styles.slotTime}>{formatTime(s.startsAt, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={() => more(p)} hitSlop={6}>
                  <Text style={styles.more}>{fr ? 'Plus d’horaires' : 'More times'}</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy, paddingHorizontal: spacing.xl },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  chipTextOn: { color: colors.white },
  rail: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: 4 },
  card: { width: 272, gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  skeleton: { height: 190, marginHorizontal: spacing.xl, backgroundColor: colors.greenSoft, borderWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  avatarText: { fontSize: 14, fontWeight: '800', color: colors.green },
  flex: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: colors.navy },
  small: { fontSize: 12, color: colors.muted },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22a06b' },
  next: { flex: 1, fontSize: 12.5, color: colors.navy },
  nextStrong: { fontWeight: '800' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: { width: 116, paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: colors.greenSoft },
  slotPressed: { opacity: 0.7 },
  slotDay: { fontSize: 11, fontWeight: '600', color: colors.muted },
  slotTime: { fontSize: 15, fontWeight: '800', color: colors.green },
  more: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.green },
  empty: { paddingHorizontal: spacing.xl, fontSize: 13, color: colors.muted },
});
