import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppConfig, getCountries, getNews } from '../../api/endpoints';
import type { Country, News } from '../../api/types';
import { countryStore } from '../../auth/storage';
import { BrandMark } from '../../components/Brand';
import { useNewsMeta } from '../../components/NewsCards';
import { Button } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors, radius, spacing, type } from '../../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Salutation selon l'heure, comme dans les grandes applis de rendez-vous. */
function greeting(lang: string): string {
  const h = new Date().getHours();
  const evening = h >= 18 || h < 5;
  if (lang === 'en') return evening ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon';
  return evening ? 'Bonsoir' : 'Bonjour';
}

/**
 * Démo d'accueil (sans compte), organisée comme les applis de référence : un bandeau vert (pays, logo, connexion,
 * salutation, recherche), une carte d'actualité à cheval, « Prendre rendez-vous » en deux grandes cartes, puis
 * les actualités, et une barre d'onglets en bas (Accueil, Rendez-vous, Santé, WhatsApp, Compte).
 */
export default function WelcomeDemoScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [news, setNews] = useState<News[]>([]);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const meta = useNewsMeta(countries);
  const name = (c: Country) => (lang === 'fr' ? c.nameFr : c.nameEn);
  const current = countries.find((c) => c.code === country);
  const fr = lang === 'fr';

  useEffect(() => {
    let alive = true;
    Promise.all([getCountries(), countryStore.load()])
      .then(([list, saved]) => {
        if (!alive) return;
        setCountries(list);
        const region = getLocales()[0]?.regionCode ?? null;
        setCountry([saved, region].find((code) => code && list.some((c) => c.code === code)) ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    getAppConfig()
      .then((c) => setWhatsapp(c.whatsappNumber?.replace(/\D/g, '') || null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    getNews({ countryCode: country, size: 10 })
      .then((p) => alive && setNews(p.content))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [country]);

  function choose(code: string) {
    setCountry(code);
    setPicking(false);
    void countryStore.save(code);
  }

  const [headline, ...others] = news;
  const book = (icon: IconName, title: string, text: string, bg: string, fg: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bookCard, { backgroundColor: bg }, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <Text style={[styles.bookTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.bookText, { color: fg }]}>{text}</Text>
      </View>
      <View style={styles.bookArt}>
        <MaterialCommunityIcons name={icon} size={46} color={fg} />
      </View>
    </Pressable>
  );
  const tab = (icon: React.ComponentProps<typeof Ionicons>['name'], label: string, active: boolean, onPress?: () => void) => (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
      <Ionicons name={icon} size={24} color={active ? colors.green : colors.muted} />
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {/* Heure et batterie en blanc sur le bandeau vert, de nouveau sombres sur les écrans suivants. */}
      <StatusBar style={focused ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={styles.bar}>
            <BrandMark />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('welcome.country')}
              onPress={() => setPicking(true)}
              style={({ pressed }) => [styles.country, pressed && styles.pressed]}
            >
              <Text style={styles.countryText} numberOfLines={1}>{current ? name(current) : t('common.allCountries')}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.white} />
            </Pressable>
            <View style={styles.flex} />
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('EmailLogin')} hitSlop={8}>
              <Text style={styles.login}>{t('welcome.login')}</Text>
            </Pressable>
          </View>
          <Text style={styles.hello}>{greeting(lang)},</Text>
          <Text style={styles.slogan}>
            {fr ? 'Votre santé, ' : 'Your health, '}
            <Text style={styles.sloganAccent}>{fr ? 'simplement' : 'simply'}</Text>
          </Text>
          <Pressable accessibilityRole="search" onPress={() => navigation.navigate('Search')} style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
            <Ionicons name="search" size={20} color={colors.green} />
            <Text style={styles.searchText} numberOfLines={1}>{fr ? 'Médecin, spécialité, symptôme…' : 'Doctor, specialty, symptom…'}</Text>
          </Pressable>
        </View>

        {headline ? (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('NewsDetail', { news: headline, countries })} style={({ pressed }) => [styles.feature, pressed && styles.pressed]}>
            <View style={styles.flex}>
              <Text style={styles.featureMeta}>{meta(headline)}</Text>
              <Text style={styles.featureTitle} numberOfLines={3}>{headline.title}</Text>
            </View>
            <View style={styles.featureArt}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={34} color={colors.green} />
            </View>
          </Pressable>
        ) : <View style={styles.featureGap} />}

        <View style={styles.section}>
          <Text style={type.h2}>{fr ? 'Prendre rendez-vous' : 'Book an appointment'}</Text>
          {book('stethoscope', fr ? 'Un médecin' : 'A doctor', fr ? 'Généraliste ou spécialiste' : 'GP or specialist', colors.green, colors.white, () => navigation.navigate('BookFacility', { countryCode: country }))}
          {book('hospital-building', fr ? 'Une structure' : 'A facility', fr ? 'Clinique, hôpital, cabinet' : 'Clinic, hospital, practice', colors.gold, colors.navy, () => navigation.navigate('BookFacility', { countryCode: country }))}
        </View>


        {others.length ? (
          <View style={styles.section}>
            <Text style={type.h2}>{fr ? 'À la une' : 'Trending now'}</Text>
            <FlatList
              horizontal
              data={others}
              keyExtractor={(n) => n.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('NewsDetail', { news: item, countries })} style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
                  <Text style={styles.featureMeta} numberOfLines={1}>{meta(item)}</Text>
                  <Text style={styles.newsTitle} numberOfLines={3}>{item.title}</Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {tab('home', fr ? 'Accueil' : 'Home', true)}
        {tab('calendar-outline', fr ? 'Rendez-vous' : 'Appointments', false, () => navigation.navigate('EmailLogin'))}
        {tab('heart-outline', fr ? 'Santé' : 'Health', false, () => navigation.navigate('News'))}
        {whatsapp
          ? tab('logo-whatsapp', 'WhatsApp', false, () =>
              void Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(t('support.whatsappText'))}`),
            )
          : null}
        {tab('person-outline', fr ? 'Compte' : 'Account', false, () => navigation.navigate('EmailLogin'))}
      </View>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={[type.h2, styles.modalTitle]}>{t('welcome.country')}</Text>
          <FlatList
            data={countries}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => choose(item.code)} style={[styles.row, item.code === country && styles.rowOn]}>
                <Text style={type.body}>{name(item)}</Text>
                {item.code === country ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}
              </Pressable>
            )}
          />
          <View style={styles.modalFooter}>
            <Button title={t('common.close')} variant="secondary" onPress={() => setPicking(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  hero: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingBottom: 64,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: -spacing.sm },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  countryText: { flexShrink: 1, color: colors.white, fontSize: 14, fontWeight: '700' },
  login: { color: colors.white, fontSize: 15, fontWeight: '700' },
  hello: { marginTop: spacing.lg, color: 'rgba(255, 255, 255, 0.85)', fontSize: 17, fontWeight: '600' },
  slogan: { color: colors.white, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sloganAccent: { color: colors.gold },
  search: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  searchText: { flex: 1, fontSize: 16, color: colors.muted },
  feature: {
    marginTop: -40,
    marginHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    shadowColor: '#0F2A47',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  featureGap: { height: spacing.sm },
  featureMeta: { fontSize: 12, fontWeight: '700', color: colors.green },
  featureTitle: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.navy },
  featureArt: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.md },
  bookCard: { flexDirection: 'row', alignItems: 'center', minHeight: 104, paddingHorizontal: spacing.xl, borderRadius: 18 },
  bookTitle: { fontSize: 20, fontWeight: '800' },
  bookText: { marginTop: 2, fontSize: 14, opacity: 0.9 },
  bookArt: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  rail: { gap: spacing.md, paddingRight: spacing.xl },
  newsCard: { width: 240, minHeight: 104, gap: 6, padding: 14, borderRadius: radius.card, backgroundColor: '#F6F8F7' },
  newsTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.navy },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tabTextOn: { color: colors.green },
  modalTitle: { padding: spacing.xl, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowOn: { backgroundColor: colors.greenSoft },
  modalFooter: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
