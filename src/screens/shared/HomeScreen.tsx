import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCountries, getNews, getProfile, myAppointments } from '../../api/endpoints';
import type { Appointment, Country, News, Profile } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useNewsMeta } from '../../components/NewsCards';
import { Banner } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDayLong, formatTime } from '../../lib/format';
import { userCountry } from '../../lib/userCountry';
import { colors, radius, spacing, type } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Accueil après connexion (patient et médecin) : l'essentiel d'abord — prendre rendez-vous et le prochain
 * rendez-vous (patient), ou les rendez-vous du jour (médecin) — puis les raccourcis et les actualités.
 */
export default function HomeScreen({ navigation }: { navigation: any }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isDoctor = user?.role === 'PRACTITIONER';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const meta = useNewsMeta(countries);

  const load = useCallback(async () => {
    const [p, a, c] = await Promise.allSettled([getProfile(), myAppointments(), getCountries()]);
    if (p.status === 'fulfilled') setProfile(p.value);
    if (a.status === 'fulfilled') setAppointments(a.value);
    if (c.status === 'fulfilled') setCountries(c.value);
    // Actualités du pays du compte (et celles de toute l'Afrique).
    const country = await userCountry();
    getNews({ countryCode: country, size: 8 })
      .then((n) => setNews(n.content))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const now = Date.now();
  const upcoming = appointments
    .filter((a) => new Date(a.endsAt).getTime() > now && (a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT'))
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt));
  const todayKey = new Date().toDateString();
  const today = upcoming.filter((a) => new Date(a.startsAt).toDateString() === todayKey);
  const next = upcoming[0];
  const firstName = isDoctor ? `Dr ${profile?.practitioner?.lastName ?? ''}`.trim() : profile?.patient?.firstName ?? '';
  const pending = isDoctor && profile?.practitioner && profile.practitioner.verificationStatus !== 'VERIFIED';

  const shortcuts: { icon: IconName; label: string; onPress: () => void; danger?: boolean }[] = isDoctor
    ? [
        { icon: 'time-outline', label: t('tab.availability'), onPress: () => navigation.navigate('Availability') },
        { icon: 'business-outline', label: t('account.structures'), onPress: () => navigation.navigate('MyStructures') },
        { icon: 'help-circle-outline', label: t('account.helpTitle'), onPress: () => navigation.navigate('Faq') },
      ]
    : [
        { icon: 'calendar-outline', label: t('home.myAppointments'), onPress: () => navigation.navigate('Consultations') },
        { icon: 'help-circle-outline', label: t('account.helpTitle'), onPress: () => navigation.navigate('Faq') },
        { icon: 'alert-circle-outline', label: t('support.emergency'), onPress: () => navigation.navigate('Emergency'), danger: true },
      ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.greeting}>
        <Text style={type.title}>{firstName ? t('home.hello', { name: firstName }) : t('home.helloAlone')}</Text>
        <Text style={type.small}>{formatDayLong(new Date().toISOString(), locale)}</Text>
      </View>

      {pending ? <Banner kind="info" text={t('home.pending')} /> : null}

      {!isDoctor ? (
        <Pressable
          accessibilityRole="search"
          onPress={() => navigation.navigate('Search')}
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Ionicons name="search" size={20} color={colors.muted} />
          <Text style={styles.searchText} numberOfLines={1}>
            {t('welcome.search')}
          </Text>
        </Pressable>
      ) : null}

      {!isDoctor ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('BookFacility')}
          style={({ pressed }) => [styles.bookCard, pressed && styles.pressed]}
        >
          <View style={styles.bookIcon}>
            <Ionicons name="add" size={28} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.bookTitle}>{t('appt.book')}</Text>
            <Text style={styles.bookText}>{t('home.bookText')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={type.h2}>{isDoctor ? t('home.today') : t('home.next')}</Text>
          <Text style={styles.link} onPress={() => navigation.navigate('Consultations')}>{t('home.seeAll')}</Text>
        </View>
        {isDoctor ? (
          today.length ? (
            <View style={styles.card}>
              {today.map((a, i) => (
                <View key={a.id} style={[styles.agendaRow, i < today.length - 1 && styles.rowBorder]}>
                  <Text style={styles.agendaTime}>{formatTime(a.startsAt, locale)}</Text>
                  <View style={styles.flex}>
                    <Text style={type.label}>{a.patientName}</Text>
                    <Text style={type.small} numberOfLines={1}>{a.reason || a.facilityName || t(`mode.${a.mode}`)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={type.small}>
              {upcoming.length ? t('home.noneTodayNext', { date: formatDayLong(upcoming[0].startsAt, locale) }) : t('home.noneToday')}
            </Text>
          )
        ) : next ? (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Consultations')} style={styles.card}>
            <View style={styles.nextBody}>
              <Text style={type.h3}>{formatDayLong(next.startsAt, locale)} · {formatTime(next.startsAt, locale)}</Text>
              <Text style={type.body}>Dr {next.practitionerName}</Text>
              <Text style={type.small}>{next.mode === 'VIDEO' ? t('book.video') : next.facilityName ?? ''}</Text>
              {next.status === 'PENDING_PAYMENT' ? (
                <View style={[styles.badge, styles.badgeWait]}><Text style={[styles.badgeText, { color: colors.orange }]}>{t('home.toPay')}</Text></View>
              ) : (
                <View style={styles.badge}><Text style={styles.badgeText}>{t('home.confirmed')}</Text></View>
              )}
            </View>
          </Pressable>
        ) : (
          <Text style={type.small}>{t('home.noneNext')}</Text>
        )}
      </View>

      <View style={styles.shortcuts}>
        {shortcuts.map((s) => (
          <Pressable key={s.label} accessibilityRole="button" onPress={s.onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
            <View style={[styles.shortcutIcon, s.danger && { backgroundColor: colors.orangeSoft }]}>
              <Ionicons name={s.icon} size={22} color={s.danger ? colors.orange : colors.green} />
            </View>
            <Text style={styles.shortcutText} numberOfLines={2}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {news.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={type.h2}>{t('welcome.news')}</Text>
            <Text style={styles.link} onPress={() => navigation.navigate('News')}>{t('home.seeAll')}</Text>
          </View>
          <FlatList
            horizontal
            data={news}
            keyExtractor={(n) => n.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('NewsDetail', { news: item, countries })}
                style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}
              >
                <Text style={styles.newsMeta} numberOfLines={1}>{meta(item)}</Text>
                <Text style={styles.newsTitle} numberOfLines={3}>{item.title}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#F6F8F7',
  },
  searchText: { flex: 1, fontSize: 16, color: colors.muted },
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.xl },
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
  greeting: { gap: 2 },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.green },
  bookIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bookTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  bookText: { fontSize: 14, color: colors.white, opacity: 0.9 },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  nextBody: { padding: spacing.lg, gap: 4 },
  badge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
  badgeWait: { backgroundColor: colors.orangeSoft },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.green },
  agendaRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', padding: spacing.lg },
  agendaTime: { fontSize: 17, fontWeight: '800', color: colors.green, width: 56 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  shortcuts: { flexDirection: 'row', gap: spacing.md },
  shortcut: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.card, backgroundColor: '#F6F8F7' },
  shortcutIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  shortcutText: { fontSize: 13, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  rail: { gap: 12 },
  newsCard: { width: 240, minHeight: 100, gap: 6, padding: 14, borderRadius: radius.card, backgroundColor: '#F6F8F7' },
  newsMeta: { fontSize: 12, fontWeight: '700', color: colors.green },
  newsTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.navy },
});
