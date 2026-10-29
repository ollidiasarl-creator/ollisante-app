import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getSlots, searchPractitioners } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import type { AppointmentMode, Facility, PractitionerSummary, Slot, Specialty } from '../../api/types';
import { Banner, Button, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { addDays, dayKey, formatMoney, formatTime, isoDate } from '../../lib/format';
import { colors, radius, spacing, type } from '../../theme';

/** Nombre de jours affichés côte à côte, et de créneaux visibles par jour avant « Voir plus d'horaires ». */
const DAYS = 4;
const VISIBLE = 4;

type SlotState = Slot[] | 'loading' | 'error';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Prendre rendez-vous, étape 3 : les praticiens et leurs créneaux, jour par jour. */
export default function BookAgendaScreen({ route, navigation }: { route: any; navigation: any }) {
  const { countryCode, facility, video, specialty } = route.params as {
    countryCode: string;
    facility?: Facility;
    video?: boolean;
    specialty: Specialty;
  };
  const { t, lang, locale } = useI18n();
  // Sans compte : la liste des médecins seulement ; les créneaux ne se voient qu'une fois connecté.
  const guest = useAuth().status === 'signedOut';
  const [start, setStart] = useState(startOfToday);
  const [practitioners, setPractitioners] = useState<PractitionerSummary[]>([]);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const mode: AppointmentMode | undefined = video ? 'VIDEO' : facility ? 'IN_PERSON' : undefined;

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const canGoBack = start.getTime() > startOfToday().getTime();

  const loadPractitioners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await searchPractitioners({
        countryCode,
        specialty: specialty.code,
        facilityId: facility?.id,
        teleconsultation: video ? true : null,
        size: 30,
      });
      setPractitioners(page.content);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [countryCode, specialty.code, facility?.id, video, t]);

  useEffect(() => {
    void loadPractitioners();
  }, [loadPractitioners]);

  // Créneaux de chaque praticien pour les jours affichés (rechargés quand on change de semaine).
  useEffect(() => {
    if (guest || practitioners.length === 0) return;
    sequence.current += 1;
    const mine = sequence.current;
    const from = isoDate(start);
    const to = isoDate(addDays(start, DAYS - 1));
    setSlots(Object.fromEntries(practitioners.map((p) => [p.id, 'loading' as const])));
    for (const p of practitioners) {
      getSlots(p.id, { from, to, mode, facilityId: facility?.id })
        .then((list) => mine === sequence.current && setSlots((s) => ({ ...s, [p.id]: list })))
        .catch(() => mine === sequence.current && setSlots((s) => ({ ...s, [p.id]: 'error' })));
    }
  }, [guest, practitioners, start, mode, facility?.id]);

  const specialtyName = lang === 'fr' ? specialty.nameFr : specialty.nameEn;
  const dayLabel = (d: Date) => ({
    weekday: d.toLocaleDateString(locale, { weekday: 'short' }),
    date: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
  });

  const header = (
    <View style={styles.header}>
      <Text style={styles.place}>{facility ? facility.name : t('book.video')}</Text>
      <Text style={type.title}>{specialtyName}</Text>
      {guest ? (
        <Banner kind="info" text={t('book.guestSlots')} />
      ) : (
        <View style={styles.weekNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('book.previousDays')}
            disabled={!canGoBack}
            onPress={() => setStart((d) => addDays(d, -DAYS))}
            style={[styles.navButton, !canGoBack && styles.navDisabled]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.green} />
          </Pressable>
          <Text style={type.label}>
            {dayLabel(days[0]).date} – {dayLabel(days[DAYS - 1]).date}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('book.nextDays')}
            onPress={() => setStart((d) => addDays(d, DAYS))}
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.green} />
          </Pressable>
        </View>
      )}
      {error ? (
        <>
          <Banner text={error} />
          <Button title={t('common.retry')} variant="secondary" onPress={() => void loadPractitioners()} />
        </>
      ) : null}
    </View>
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={practitioners}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      ListEmptyComponent={error ? null : <EmptyState title={t('book.noDoctorTitle')} text={t('book.noDoctorText')} />}
      ListFooterComponent={
        practitioners.length && !guest ? <Text style={type.small}>{t('booking.timezoneNote')}</Text> : null
      }
      renderItem={({ item: p }) => {
        const state = slots[p.id];
        const isOpen = !!expanded[p.id];
        const byDay = days.map((d) =>
          Array.isArray(state) ? state.filter((s) => dayKey(s.startsAt) === isoDate(d)) : [],
        );
        const hasMore = byDay.some((list) => list.length > VISIBLE);
        const fee =
          p.consultationFeeMinor && p.feeCurrency ? formatMoney(p.consultationFeeMinor, p.feeCurrency, locale) : null;
        return (
          <View style={styles.card}>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {p.firstName.charAt(0)}
                  {p.lastName.charAt(0)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={type.h3}>
                  {t('book.doctor')} {p.firstName} {p.lastName}
                </Text>
                <Text style={type.small}>
                  {p.specialties.map((s) => (lang === 'fr' ? s.nameFr : s.nameEn)).join(', ')}
                </Text>
                {fee ? <Text style={styles.fee}>{fee}</Text> : null}
              </View>
            </View>

            {guest ? (
              <Button
                title={t('book.guestLogin')}
                variant="secondary"
                onPress={() =>
                  navigation.navigate('EmailLogin', {
                    profile: 'patient',
                    toBook: true,
                  })
                }
              />
            ) : state === 'loading' || state === undefined ? (
              <Text style={type.small}>{t('book.loadingSlots')}</Text>
            ) : state === 'error' ? (
              <Text style={styles.slotError}>{t('book.slotsError')}</Text>
            ) : (
              <>
                <View style={styles.agenda}>
                  {days.map((d, i) => {
                    const label = dayLabel(d);
                    const list = isOpen ? byDay[i] : byDay[i].slice(0, VISIBLE);
                    return (
                      <View key={isoDate(d)} style={styles.column}>
                        <Text style={styles.weekday}>{label.weekday}</Text>
                        <Text style={styles.date}>{label.date}</Text>
                        {list.length === 0 ? <Text style={styles.none}>–</Text> : null}
                        {list.map((s) => (
                          <Pressable
                            key={`${s.startsAt}-${s.mode}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${label.weekday} ${label.date} ${formatTime(s.startsAt, locale)}`}
                            onPress={() =>
                              navigation.navigate('BookConfirm', {
                                practitioner: p,
                                slot: s,
                                facility,
                              })
                            }
                            style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
                          >
                            <Text style={styles.slotText}>{formatTime(s.startsAt, locale)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })}
                </View>
                {byDay.every((list) => list.length === 0) ? (
                  <Text style={type.small}>{t('book.noSlotDays')}</Text>
                ) : null}
                {hasMore ? (
                  <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => ({ ...e, [p.id]: !isOpen }))}>
                    <Text style={styles.more}>{isOpen ? t('book.lessSlots') : t('book.moreSlots')}</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.sm },
  place: { fontSize: 15, fontWeight: '600', color: colors.green },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.35 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  identity: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: colors.green },
  flex: { flex: 1, gap: 2 },
  fee: { fontSize: 14, fontWeight: '700', color: colors.navy },
  agenda: { flexDirection: 'row', gap: spacing.xs },
  column: { flex: 1, alignItems: 'stretch', gap: spacing.xs },
  weekday: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  none: { fontSize: 16, color: colors.border, textAlign: 'center' },
  slot: {
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPressed: { backgroundColor: colors.green },
  slotText: { fontSize: 14, fontWeight: '700', color: colors.green },
  slotError: { fontSize: 14, color: colors.orange },
  more: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
    textAlign: 'center',
  },
});
