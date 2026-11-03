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
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { useNewsMeta } from '../../components/NewsCards';
import { Button } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors, radius, spacing, type } from '../../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Valeur enregistrée pour « Tous les pays ». */
const ALL = 'ALL';

/** Drapeau d'un pays à partir de son code (FR → 🇫🇷). */
const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** Salutation selon l'heure, comme dans les grandes applis de rendez-vous. */
function greeting(lang: string): string {
  const h = new Date().getHours();
  const evening = h >= 18 || h < 5;
  if (lang === 'en') return evening ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon';
  return evening ? 'Bonsoir' : 'Bonjour';
}

/**
 * Accueil sans compte, organisé comme les applis de référence : un bandeau vert (logo, pays, langue, connexion,
 * salutation, recherche), les trois profils en blocs compacts (Patient, Médecin, Structure), les actualités en
 * dessous, et une barre d'onglets en bas (Accueil, Rendez-vous, Santé, WhatsApp, Compte).
 */
export default function WelcomeDemoScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  // Bloc touché (Patient, Médecin, Structure) : le pays est demandé d'abord, comme sur le site, puis on continue.
  const [pending, setPending] = useState<'patient' | 'practitioner' | 'structure' | null>(null);
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
        // « Tous les pays » choisi la dernière fois : on le garde (sans revenir au pays du téléphone).
        if (saved === ALL) return setCountry(null);
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

  function choose(code: string | null) {
    setCountry(code);
    setPicking(false);
    void countryStore.save(code ?? ALL);
    const next = pending;
    if (!next || !code) return setPending(null);
    // Patient : second choix dans la même fenêtre (un médecin ou une structure), comme sur le site.
    if (next === 'patient') return setGateStep('choice');
    setPending(null);
    navigation.navigate('ProInfo', { profile: next });
  }
  const [gateCode, setGateCode] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateStep, setGateStep] = useState<'country' | 'choice'>('country');
  const gateCountry = countries.find((c) => c.code === gateCode);
  const ask = (profile: 'patient' | 'practitioner' | 'structure') => {
    setGateCode(country);
    setGateOpen(false);
    setGateStep('country');
    setPending(profile);
  };
  const close = () => {
    setPicking(false);
    setPending(null);
    setGateStep('country');
  };
  const consult = (what: 'doctor' | 'facility') => {
    const code = gateCode;
    close();
    if (!code) return;
    const c = countries.find((x) => x.code === code);
    if (what === 'facility') navigation.navigate('BookFacility', { countryCode: code });
    else navigation.navigate('BookSpecialty', { countryCode: code, place: c ? `${flagOf(c.code)} ${name(c)}` : '' });
  };

  const book = (icon: IconName, title: string, text: string, bg: string, fg: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bookCard, { backgroundColor: bg }, pressed && styles.pressed]}>
      <View style={styles.bookArt}>
        <MaterialCommunityIcons name={icon} size={20} color={fg} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.bookTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.bookText, { color: fg }]} numberOfLines={1}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={fg} />
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
              <Text style={styles.countryText} numberOfLines={1}>{current ? `${flagOf(current.code)} ${name(current)}` : `🌍 ${fr ? 'Tous pays' : 'All'}`}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.white} />
            </Pressable>
            <View style={styles.flex} />
            <LanguageSwitch compact />
            <Pressable accessibilityRole="button" accessibilityLabel={t('welcome.login')} onPress={() => navigation.navigate('EmailLogin')} hitSlop={8}>
              <Ionicons name="person-circle-outline" size={30} color={colors.white} />
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


        <View style={[styles.section, styles.first]}>
          {book('account-heart-outline', t('welcome.tile.patient'), t('welcome.tile.patient.text'), colors.green, colors.white, () => ask('patient'))}
          {book('stethoscope', t('welcome.tile.practitioner'), t('welcome.tile.practitioner.text'), colors.navy, colors.white, () => ask('practitioner'))}
          {book('hospital-building', t('welcome.tile.structure'), t('welcome.tile.structure.text'), colors.gold, colors.navy, () => ask('structure'))}
        </View>


        {news.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{fr ? 'À la une' : 'Trending now'}</Text>
            <FlatList
              horizontal
              data={news}
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
        {/* Sans numéro WhatsApp enregistré dans l'administration, l'onglet ouvre l'aide. */}
        {tab('logo-whatsapp', 'WhatsApp', false, () =>
          whatsapp
            ? void Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(t('support.whatsappText'))}`)
            : navigation.navigate('Faq'),
        )}
        {tab('person-outline', fr ? 'Compte' : 'Account', false, () => navigation.navigate('EmailLogin'))}
      </View>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.gateBackdrop}>
          {gateStep === 'choice' ? (
            <View style={styles.gateCard}>
              <Text style={styles.gateTag}>{gateCountry ? `${flagOf(gateCountry.code)} ${name(gateCountry)}` : ''}</Text>
              <Text style={type.h2}>{t('patient.consult')}</Text>
              <Pressable accessibilityRole="button" onPress={() => consult('doctor')} style={({ pressed }) => [styles.choice, { backgroundColor: colors.navy }, pressed && styles.pressed]}>
                <Text style={[styles.choiceTitle, { color: colors.white }]}>{t('patient.doctor')}</Text>
                <Text style={[styles.choiceText, { color: colors.white }]}>{t('patient.doctor.text')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => consult('facility')} style={({ pressed }) => [styles.choice, { backgroundColor: colors.gold }, pressed && styles.pressed]}>
                <Text style={[styles.choiceTitle, { color: colors.navy }]}>{t('patient.structure')}</Text>
                <Text style={[styles.choiceText, { color: colors.navy }]}>{t('welcome.tile.structure.text')}</Text>
              </Pressable>
              <Button title={t('patient.changeCountry')} variant="ghost" onPress={() => setGateStep('country')} />
              <Button title={t('common.cancel')} variant="ghost" onPress={close} />
            </View>
          ) : (
          <View style={styles.gateCard}>
            {pending ? <Text style={styles.gateTag}>{t(`welcome.tile.${pending}`)}</Text> : null}
            <Text style={type.h2}>{pending === 'patient' ? t('search.country') : t('welcome.countryPro')}</Text>
            {/* Liste déroulante dans la fenêtre (une seconde fenêtre ne s'ouvrirait pas par-dessus sur iPhone). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('welcome.country')}
              onPress={() => setGateOpen((o) => !o)}
              style={[styles.select, gateOpen && styles.selectOpen]}
            >
              <Text style={[type.body, styles.flex, !gateCode && { color: colors.muted }]} numberOfLines={1}>
                {gateCountry ? `${flagOf(gateCountry.code)} ${name(gateCountry)}` : t('welcome.country')}
              </Text>
              <Ionicons name={gateOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.navy} />
            </Pressable>
            {gateOpen ? (
              <ScrollView style={styles.dropdown} nestedScrollEnabled>
                {countries.map((c) => (
                  <Pressable
                    key={c.code}
                    accessibilityRole="button"
                    onPress={() => {
                      setGateCode(c.code);
                      setGateOpen(false);
                    }}
                    style={[styles.option, c.code === gateCode && styles.rowOn]}
                  >
                    <Text style={type.body}>{flagOf(c.code)} {name(c)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <Button title={t('common.continue')} disabled={!gateCode} onPress={() => gateCode && choose(gateCode)} />
            <Button title={t('common.cancel')} variant="ghost" onPress={close} />
          </View>
          )}
        </View>
      </Modal>

      <Modal visible={picking} animationType="slide" onRequestClose={close}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={[type.h2, styles.modalTitle]}>{t('welcome.country')}</Text>
          <FlatList
            data={countries}
            ListHeaderComponent={
              (
              <Pressable accessibilityRole="button" onPress={() => choose(null)} style={[styles.row, country === null && styles.rowOn]}>
                <Text style={type.body}>🌍 {t('common.allCountries')}</Text>
                {country === null ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}
              </Pressable>
              )
            }
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => choose(item.code)} style={[styles.row, item.code === country && styles.rowOn]}>
                <Text style={type.body}>{name(item)}</Text>
                {item.code === country ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}
              </Pressable>
            )}
          />
          <View style={styles.modalFooter}>
            <Button title={t('common.close')} variant="secondary" onPress={close} />
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
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: -spacing.sm },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 170,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  countryText: { flexShrink: 1, color: colors.white, fontSize: 14, fontWeight: '700' },
  hello: { marginTop: spacing.md, color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, fontWeight: '600' },
  slogan: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  sloganAccent: { color: colors.gold },
  search: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  searchText: { flex: 1, fontSize: 16, color: colors.muted },
  featureMeta: { fontSize: 12, fontWeight: '700', color: colors.green },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  first: { marginTop: spacing.lg },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, gap: spacing.sm },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12 },
  bookTitle: { fontSize: 15, fontWeight: '800' },
  bookText: { fontSize: 12, opacity: 0.9 },
  bookArt: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  rail: { gap: spacing.md, paddingRight: spacing.xl },
  newsCard: { width: 230, minHeight: 84, gap: 6, padding: 14, borderRadius: radius.card, backgroundColor: '#F6F8F7' },
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
  gateBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(15, 42, 71, 0.45)' },
  gateCard: { gap: spacing.md, padding: spacing.xl, borderRadius: 18, backgroundColor: colors.white },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selectOpen: { borderColor: colors.green },
  dropdown: { maxHeight: 240, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, marginTop: -spacing.sm },
  option: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  choice: { gap: 2, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 14 },
  choiceTitle: { fontSize: 17, fontWeight: '800' },
  choiceText: { fontSize: 13, opacity: 0.9 },
  gateTag: { fontSize: 13, fontWeight: '800', color: colors.green, textTransform: 'uppercase' },
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
