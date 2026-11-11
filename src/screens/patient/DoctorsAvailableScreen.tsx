import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSlots, listFacilities, searchPractitioners } from '../../api/endpoints';
import type { Facility, PractitionerSummary, Slot } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { PlacePicker } from '../../components/PlacePicker';
import { Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { addDays, formatMoney, formatTime, isoDate } from '../../lib/format';
import { setPendingBooking } from '../../lib/pendingBooking';
import { colors, radius, spacing } from '../../theme';

const QUICK = [
  { code: '', fr: 'Tous', en: 'All' },
  { code: 'GENERAL_PRACTICE', fr: 'Généraliste', en: 'GP' },
  { code: 'PEDIATRICS', fr: 'Pédiatre', en: 'Pediatrician' },
  { code: 'GYNECOLOGY', fr: 'Gynécologue', en: 'Gynecologist' },
  { code: 'CARDIOLOGY', fr: 'Cardiologue', en: 'Cardiologist' },
  { code: 'DENTISTRY', fr: 'Dentiste', en: 'Dentist' },
];
const DAYS = 5;
const PER_DAY = 4;
const NAME_W = 132;
const DAY_W = 76;

type Row = { p: PractitionerSummary; slots: Slot[] };

/**
 * Médecins disponibles d'un pays (ville, localité) : un tableau récapitulatif — un médecin par ligne, le premier
 * horaire libre de chaque jour — puis le détail des horaires de chacun. Toucher un horaire mène à la réservation
 * (après connexion pour un visiteur).
 */
export default function DoctorsAvailableScreen({ route, navigation }: { route: any; navigation: any }) {
  const { lang, locale } = useI18n();
  const fr = lang === 'fr';
  const guest = useAuth().status === 'signedOut';
  const countryCode: string = route.params.countryCode;
  const [city, setCity] = useState<string | null>(route.params.city ?? null);
  const [locality, setLocality] = useState<string | null>(route.params.locality ?? null);
  const [spec, setSpec] = useState<string>(route.params.specialty?.code ?? '');
  const [loaded, setLoaded] = useState<{ key: string; rows: Row[] } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const key = `${countryCode}|${city ?? ''}|${locality ?? ''}|${spec}`;

  useEffect(() => {
    listFacilities(countryCode).then(setFacilities).catch(() => undefined);
  }, [countryCode]);

  useEffect(() => {
    let live = true;
    const from = isoDate(new Date());
    const to = isoDate(addDays(new Date(), 13));
    const k = `${countryCode}|${city ?? ''}|${locality ?? ''}|${spec}`;
    searchPractitioners({ countryCode, city, locality, specialty: spec || null, size: 30 })
      .then(async (page) => {
        const all = await Promise.all(
          page.content.map(async (p) => ({ p, slots: await getSlots(p.id, { from, to }).catch(() => [] as Slot[]) })),
        );
        const free = all.filter((r) => r.slots.length > 0);
        free.sort((a, b) => a.slots[0].startsAt.localeCompare(b.slots[0].startsAt));
        if (live) setLoaded({ key: k, rows: free });
      })
      .catch(() => live && setLoaded({ key: k, rows: [] }));
    return () => {
      live = false;
    };
  }, [countryCode, city, locality, spec]);

  const rows = loaded?.key === key ? loaded.rows : null;
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(new Date(), i)), []);
  const dayHead = (d: Date) => {
    if (isoDate(d) === isoDate(new Date())) return fr ? 'Auj.' : 'Today';
    if (isoDate(d) === isoDate(addDays(new Date(), 1))) return fr ? 'Demain' : 'Tmrw';
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
  };
  const onDay = (slots: Slot[], d: Date) => slots.filter((s) => isoDate(new Date(s.startsAt)) === isoDate(d));
  const pick = (p: PractitionerSummary, s: Slot) => {
    const facility = facilities.find((f) => f.id === s.facilityId);
    if (guest) {
      setPendingBooking({ practitioner: p, slot: s, facility });
      navigation.navigate('EmailLogin', { profile: 'patient', toBook: true });
    } else navigation.navigate('BookConfirm', { practitioner: p, slot: s, facility });
  };
  const placeOf = (r: Row) => facilities.find((f) => f.id === r.slots[0]?.facilityId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{fr ? 'Médecins disponibles' : 'Available doctors'}</Text>
      <Text style={styles.lead}>{fr ? 'Les horaires libres des prochains jours. Touchez-en un pour réserver.' : 'Free times in the coming days. Tap one to book.'}</Text>

      <PlacePicker country={countryCode} city={city} locality={locality} onChange={(c, l) => { setCity(c); setLocality(l); }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {QUICK.map((q) => (
          <Pressable key={q.code} accessibilityRole="button" accessibilityState={{ selected: q.code === spec }} onPress={() => setSpec(q.code)} style={[styles.chip, q.code === spec && styles.chipOn]}>
            <Text style={[styles.chipText, q.code === spec && styles.chipTextOn]}>{fr ? q.fr : q.en}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {rows === null ? (
        <View style={styles.loading}><Loading /></View>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>
          {fr ? 'Aucune disponibilité dans les prochains jours pour ce choix. Essayez une autre ville, localité ou spécialité.' : 'No availability in the coming days for this choice. Try another city, area or specialty.'}
        </Text>
      ) : (
        <>
          {/* Tableau récapitulatif : le nom reste à gauche, les jours défilent à droite. */}
          <View style={styles.card}>
            <View style={styles.recapHead}>
              <Text style={styles.h2}>{fr ? 'En un coup d’œil' : 'At a glance'}</Text>
              <Text style={styles.small}>{rows.length} {fr ? (rows.length > 1 ? 'médecins' : 'médecin') : rows.length > 1 ? 'doctors' : 'doctor'}</Text>
            </View>
            <View style={styles.recap}>
              <View style={{ width: NAME_W }}>
                <Text style={[styles.th, styles.cellHead]}>{fr ? 'Médecin' : 'Doctor'}</Text>
                {rows.map((r) => (
                  <View key={r.p.id} style={styles.nameCell}>
                    <Text style={styles.name} numberOfLines={2}>Dr {r.p.firstName} {r.p.lastName}</Text>
                    <Text style={styles.small} numberOfLines={1}>{r.p.specialties.map((s) => (fr ? s.nameFr : s.nameEn)).join(', ')}</Text>
                  </View>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.row}>
                    {days.map((d) => <Text key={isoDate(d)} style={[styles.th, styles.dayHead]}>{dayHead(d)}</Text>)}
                  </View>
                  {rows.map((r) => (
                    <View key={r.p.id} style={[styles.row, styles.rowLine]}>
                      {days.map((d) => {
                        const list = onDay(r.slots, d);
                        return (
                          <View key={isoDate(d)} style={styles.dayCell}>
                            {list.length ? (
                              <Pressable accessibilityRole="button" accessibilityLabel={`Dr ${r.p.lastName} ${dayHead(d)} ${formatTime(list[0].startsAt, locale)}`} onPress={() => pick(r.p, list[0])} style={({ pressed }) => [styles.recapSlot, pressed && styles.pressed]}>
                                <Text style={styles.recapTime}>{formatTime(list[0].startsAt, locale)}</Text>
                                {list.length > 1 ? <Text style={styles.more}>+{list.length - 1}</Text> : null}
                              </Pressable>
                            ) : (
                              <Text style={styles.none}>—</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            <Text style={styles.note}>{fr ? 'Premier horaire libre du jour ; « +3 » = 3 autres ce jour-là (détail ci-dessous).' : 'First free time of the day; “+3” = 3 more that day (details below).'}</Text>
          </View>

          <Text style={[styles.h2, styles.detailTitle]}>{fr ? 'Tous les horaires' : 'All times'}</Text>
          {rows.map((r) => {
            const f = placeOf(r);
            const fee = r.p.consultationFeeMinor != null && r.p.feeCurrency ? formatMoney(r.p.consultationFeeMinor, r.p.feeCurrency, locale) : null;
            const slotDays = [...new Set(r.slots.map((s) => isoDate(new Date(s.startsAt))))].slice(0, 3).map((k) => new Date(`${k}T12:00:00`));
            const isOpen = !!open[r.p.id];
            return (
              <View key={r.p.id} style={styles.card}>
                <View style={styles.docHead}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{`${r.p.firstName[0] ?? ''}${r.p.lastName[0] ?? ''}`.toUpperCase()}</Text></View>
                  <View style={styles.flex}>
                    <Text style={styles.docName}>Dr {r.p.firstName} {r.p.lastName}</Text>
                    <Text style={styles.small}>{r.p.specialties.map((s) => (fr ? s.nameFr : s.nameEn)).join(', ')}</Text>
                  </View>
                </View>
                {f ? <Text style={styles.fact}>{f.name}{[f.address, f.locality, f.city].filter(Boolean).length ? ` · ${[f.address, f.locality, f.city].filter(Boolean).join(', ')}` : ''}</Text> : null}
                {fee ? <Text style={styles.fact}>{fr ? 'Consultation : ' : 'Consultation: '}{fee}</Text> : null}
                {slotDays.map((d) => {
                  const list = onDay(r.slots, d);
                  return (
                    <View key={isoDate(d)} style={styles.dayBlock}>
                      <Text style={styles.dayName}>{d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
                      <View style={styles.slots}>
                        {(isOpen ? list : list.slice(0, PER_DAY)).map((s) => (
                          <Pressable key={s.startsAt} accessibilityRole="button" onPress={() => pick(r.p, s)} style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
                            <Text style={styles.slotText}>{formatTime(s.startsAt, locale)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
                {slotDays.some((d) => onDay(r.slots, d).length > PER_DAY) ? (
                  <Pressable accessibilityRole="button" onPress={() => setOpen((o) => ({ ...o, [r.p.id]: !isOpen }))} hitSlop={6}>
                    <Text style={styles.moreLink}>{isOpen ? (fr ? 'Voir moins d’horaires' : 'Fewer times') : fr ? 'Voir plus d’horaires' : 'More times'}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  lead: { fontSize: 14, color: colors.muted },
  chips: { gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  chipTextOn: { color: colors.white },
  loading: { padding: spacing.xxl },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.lg },
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  recapHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontSize: 18, fontWeight: '800', color: colors.navy },
  detailTitle: { marginTop: spacing.sm },
  small: { fontSize: 12, color: colors.muted },
  recap: { flexDirection: 'row' },
  th: { fontSize: 12, fontWeight: '700', color: colors.muted },
  cellHead: { height: 28 },
  dayHead: { width: DAY_W, height: 28, textAlign: 'center', textTransform: 'capitalize' },
  row: { flexDirection: 'row' },
  rowLine: { height: 58, alignItems: 'center' },
  nameCell: { height: 58, justifyContent: 'center', paddingRight: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontSize: 13.5, fontWeight: '800', color: colors.green },
  dayCell: { width: DAY_W, height: 58, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  recapSlot: { flexDirection: 'row', alignItems: 'baseline', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.greenSoft },
  recapTime: { fontSize: 14, fontWeight: '800', color: colors.green },
  more: { fontSize: 10.5, fontWeight: '700', color: colors.muted },
  none: { color: colors.border },
  note: { fontSize: 11.5, color: colors.muted },
  pressed: { opacity: 0.7 },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  avatarText: { fontSize: 15, fontWeight: '800', color: colors.green },
  flex: { flex: 1 },
  docName: { fontSize: 16, fontWeight: '800', color: colors.navy },
  fact: { fontSize: 13, color: colors.navy },
  dayBlock: { gap: 6, marginTop: 4 },
  dayName: { fontSize: 13, fontWeight: '700', color: colors.navy, textTransform: 'capitalize' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: { minWidth: 70, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.greenSoft },
  slotText: { fontSize: 14, fontWeight: '800', color: colors.green },
  moreLink: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.green, marginTop: 4 },
});
