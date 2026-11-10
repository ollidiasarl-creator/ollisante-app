import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppConfig, getCountries, getNews, getSpecialties } from '../../api/endpoints';
import type { Country, News, Specialty } from '../../api/types';
import { frequentSpecialties } from '../../lib/search';
import { countryStore } from '../../auth/storage';
import { BrandMark } from '../../components/Brand';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { NewsArt, newsImage, useNewsMeta } from '../../components/NewsCards';
import { Button } from '../../components/ui';
import { PlacePicker } from '../../components/PlacePicker';
import { SearchResults } from '../shared/SearchScreen';
import { useI18n } from '../../i18n';
import { colors, radius, spacing, type } from '../../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Cartes d'actualités : largeur fixe pour défiler carte par carte. */
const CARD_W = 260;
const CARD_GAP = 12;

/** Pictogramme de chaque spécialité (mêmes icônes que l'écran de choix de spécialité). */
const SPEC_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  GENERAL_PRACTICE: 'medkit', PEDIATRICS: 'happy', GYNECOLOGY: 'female', CARDIOLOGY: 'heart', DERMATOLOGY: 'hand-left',
  OPHTHALMOLOGY: 'eye', DENTISTRY: 'medical', ENT: 'ear', PSYCHIATRY: 'chatbubbles', NEUROLOGY: 'pulse',
};

/** Ce qui ouvre la fenêtre du pays : un profil, « Rendez-vous » (connexion patient) ou la connexion (choix du profil). */
type Gate = 'patient' | 'practitioner' | 'structure' | 'appointments' | 'login';

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
  const rail = useRef<FlatList<News>>(null);
  const pausedUntil = useRef(0);
  const [slide, setSlide] = useState(0);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const searchInput = useRef<TextInput>(null);
  const stopSearch = () => {
    setQuery('');
    setSearching(false);
    searchInput.current?.blur();
  };
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  // Bloc touché (Patient, Médecin, Structure) : le pays est demandé d'abord, comme sur le site, puis on continue.
  const [pending, setPending] = useState<Gate | null>(null);
  const [news, setNews] = useState<News[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const specName = (x: Specialty) => (lang === 'fr' ? x.nameFr : x.nameEn);
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
    getSpecialties()
      .then((l) => setSpecialties(frequentSpecialties(l)))
      .catch(() => undefined);
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

  // Défilement automatique, carte par carte, toutes les 4 secondes (comme les applis de référence).
  useEffect(() => {
    setSlide(0);
    if (news.length < 2 || searching) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setSlide((i) => {
        const next = (i + 1) % news.length;
        rail.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [news, searching]);

  function choose(code: string | null) {
    setCountry(code);
    setPicking(false);
    void countryStore.save(code ?? ALL);
    const next = pending;
    if (!next || !code) return setPending(null);
    // Patient : second choix dans la même fenêtre (un médecin ou une structure), comme sur le site.
    if (next === 'patient' && pickSpec) {
      const c = countries.find((x) => x.code === code);
      const s = pickSpec;
      const where = { city: gateCity, locality: gateLocality, place: placeLabel(c) };
      close();
      return navigation.navigate('DoctorsAvailable', { countryCode: code, specialty: s, ...where });
    }
    if (next === 'patient') return setGateStep('choice');
    // Connexion : le pays d'abord, puis « Je suis… » (patient, médecin, structure).
    if (next === 'login') return setGateStep('profiles');
    close();
    if (next === 'appointments') navigation.navigate('EmailLogin', { profile: 'patient' });
    else navigation.navigate('ProInfo', { profile: next });
  }
  const [gateCode, setGateCode] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateStep, setGateStep] = useState<'country' | 'choice' | 'profiles'>('country');
  const gateCountry = countries.find((c) => c.code === gateCode);
  // Ville et localité : facultatives, proposées au patient une fois le pays choisi (comme sur le site).
  const [gateCity, setGateCity] = useState<string | null>(null);
  const [gateLocality, setGateLocality] = useState<string | null>(null);
  const placeLabel = (c?: Country) =>
    c ? `${flagOf(c.code)} ${[gateLocality, gateCity, name(c)].filter(Boolean).join(', ')}` : '';
  const [pickSpec, setPickSpec] = useState<Specialty | null>(null);
  const [proMenu, setProMenu] = useState(false);
  const ask = (profile: Gate, spec: Specialty | null = null) => {
    setPickSpec(spec);
    setGateCode(country);
    setGateCity(null);
    setGateLocality(null);
    setGateOpen(false);
    setGateStep('country');
    setPending(profile);
  };
  const close = () => {
    setPicking(false);
    setPending(null);
    setPickSpec(null);
    setGateStep('country');
  };
  const consult = (what: 'doctor' | 'facility') => {
    const code = gateCode;
    close();
    if (!code) return;
    const c = countries.find((x) => x.code === code);
    const where = { city: gateCity, locality: gateLocality };
    if (what === 'facility') navigation.navigate('BookFacility', { countryCode: code, ...where });
    else navigation.navigate('DoctorsAvailable', { countryCode: code, ...where });
  };

  // Profils en bandeaux fins, l'un sous l'autre.
  const book = (icon: IconName, title: string, text: string, bg: string, fg: string, onPress: () => void) => (
    // Version « fond blanc » : carte blanche, la couleur du bloc dans le rond et le titre.
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bookCard, pressed && styles.pressed]}>
      <View style={[styles.bookArt, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={16} color={fg} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.bookTitle, { color: bg === colors.gold ? colors.navy : bg }]}>{title}</Text>
        <Text style={[styles.bookText, { color: colors.muted }]} numberOfLines={1}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={bg === colors.gold ? colors.navy : bg} />
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
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
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
              <Ionicons name="chevron-down" size={14} color={colors.navy} />
            </Pressable>
            <View style={styles.flex} />
            <LanguageSwitch compact />
            {/* « Espace pro » : médecin ou structure, puis le pays et la connexion (comme sur le site). */}
            <Pressable accessibilityRole="button" onPress={() => setProMenu(true)} hitSlop={6} style={({ pressed }) => [styles.proPill, pressed && styles.pressed]}>
              <Text style={styles.proPillText}>{fr ? 'Espace pro' : 'Pro area'}</Text>
            </Pressable>
          </View>
          <Text style={styles.hello}>{greeting(lang)},</Text>
          <Text style={styles.slogan} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {fr ? 'Votre rendez-vous médical, ' : 'Your medical appointment, '}
            <Text style={styles.sloganAccent}>{fr ? 'simplement' : 'simply'}</Text>
          </Text>
          {/* Recherche sur place : les résultats remplacent les blocs, sans changer d'écran. */}
          <View style={styles.searchRow}>
            <View style={[styles.search, styles.flex]}>
              <Ionicons name="search" size={20} color={colors.green} />
              <TextInput
                ref={searchInput}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearching(true)}
                placeholder={fr ? 'Médecin, spécialité, symptôme…' : 'Doctor, specialty, symptom…'}
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => setSubmitted((n) => n + 1)}
              />
              {query ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            {searching ? (
              <Pressable accessibilityRole="button" onPress={stopSearch} hitSlop={8}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>


        {searching ? (
          <View style={styles.searchResults}>
            <SearchResults text={query} setText={setQuery} submitted={submitted} navigation={navigation} />
          </View>
        ) : (
          <>
        <View style={[styles.section, styles.first]}>
          {book('account-heart-outline', t('welcome.tile.patient'), t('welcome.tile.patient.text'), colors.green, colors.white, () => ask('patient'))}
          {book('stethoscope', t('welcome.tile.practitioner'), t('welcome.tile.practitioner.text'), colors.navy, colors.white, () => ask('practitioner'))}
          {book('hospital-building', t('welcome.tile.structure'), t('welcome.tile.structure.text'), colors.gold, colors.navy, () => ask('structure'))}
        </View>



        {news.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{fr ? 'Actualités santé' : 'Health news'}</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('News')} hitSlop={8}>
                <Text style={styles.seeAll}>{fr ? 'Tout voir' : 'See all'}</Text>
              </Pressable>
            </View>
            <FlatList
              ref={rail}
              horizontal
              data={news}
              keyExtractor={(n) => n.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              snapToInterval={CARD_W + CARD_GAP}
              decelerationRate="fast"
              getItemLayout={(_, i) => ({ length: CARD_W + CARD_GAP, offset: (CARD_W + CARD_GAP) * i, index: i })}
              onScrollBeginDrag={() => {
                pausedUntil.current = Date.now() + 8000;
              }}
              onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP)))}
              renderItem={({ item }) => (
                // Carte illustrée, comme les rubriques « à la une » des applis de référence : la photo (ou le
                // visuel aux couleurs Ollisanté), le titre en blanc sur un voile sombre, puis « Lire ».
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('NewsDetail', { news: item, countries })} style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
                  {newsImage(item) ? (
                    <Image source={{ uri: newsImage(item)! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <NewsArt item={item} flagSize={40} />
                  )}
                  <View style={styles.newsShade}>
                    <Text style={styles.newsMeta} numberOfLines={1}>{meta(item)}</Text>
                    <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.newsRead}>{fr ? 'Lire' : 'Read'} →</Text>
                  </View>
                </Pressable>
              )}
            />
            {news.length > 1 ? (
              <View style={styles.dots}>
                {news.map((n, i) => <View key={n.id} style={[styles.dot, i === slide && styles.dotOn]} />)}
              </View>
            ) : null}
          </View>
        ) : null}

        {specialties.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{fr ? 'Spécialités fréquentes' : 'Popular specialties'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specRail}>
              {specialties.map((x) => (
                <Pressable key={x.code} accessibilityRole="button" onPress={() => ask('patient', x)} style={({ pressed }) => [styles.spec, pressed && styles.pressed]}>
                  <View style={styles.specIcon}>
                    <Ionicons name={SPEC_ICONS[x.code] ?? 'medical'} size={20} color={colors.green} />
                  </View>
                  <Text style={styles.specName} numberOfLines={2}>{specName(x)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

          </>
        )}
      </ScrollView>

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {tab('home', fr ? 'Accueil' : 'Home', true)}
        {tab('calendar-outline', fr ? 'Rendez-vous' : 'Appointments', false, () => ask('appointments'))}
        {tab('heart-outline', fr ? 'Santé' : 'Health', false, () => navigation.navigate('News'))}
        {/* Sans numéro WhatsApp enregistré dans l'administration, l'onglet ouvre l'aide. */}
        {tab('logo-whatsapp', 'WhatsApp', false, () =>
          whatsapp
            ? void Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(t('support.whatsappText'))}`)
            : navigation.navigate('Faq'),
        )}
        {tab('person-outline', fr ? 'Compte' : 'Account', false, () => ask('login'))}
      </View>

      <Modal visible={proMenu} transparent animationType="fade" onRequestClose={() => setProMenu(false)}>
        <View style={styles.gateBackdrop}>
          <View style={styles.gateCard}>
            <Text style={styles.gateTag}>{fr ? 'Espace pro' : 'Pro area'}</Text>
            <Text style={type.h2}>{t('welcome.iam')}</Text>
            {(['practitioner', 'structure'] as const).map((p) => (
              <Pressable
                key={p}
                accessibilityRole="button"
                onPress={() => {
                  setProMenu(false);
                  ask(p);
                }}
                style={({ pressed }) => [styles.choice, { backgroundColor: p === 'practitioner' ? colors.navy : colors.gold }, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceTitle, { color: p === 'practitioner' ? colors.white : colors.navy }]}>{t(`welcome.tile.${p}`)}</Text>
              </Pressable>
            ))}
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setProMenu(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.gateBackdrop}>
          {gateStep === 'profiles' ? (
            <View style={styles.gateCard}>
              <Text style={styles.gateTag}>{gateCountry ? `${flagOf(gateCountry.code)} ${name(gateCountry)}` : ''}</Text>
              <Text style={type.h2}>{t('welcome.iam')}</Text>
              {(['patient', 'practitioner', 'structure'] as const).map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  onPress={() => {
                    close();
                    navigation.navigate('EmailLogin', { profile: p });
                  }}
                  style={({ pressed }) => [styles.choice, { backgroundColor: p === 'patient' ? colors.green : p === 'practitioner' ? colors.navy : colors.gold }, pressed && styles.pressed]}
                >
                  <Text style={[styles.choiceTitle, { color: p === 'structure' ? colors.navy : colors.white }]}>{t(`welcome.tile.${p}`)}</Text>
                </Pressable>
              ))}
              <Button title={t('patient.changeCountry')} variant="ghost" onPress={() => setGateStep('country')} />
              <Button title={t('common.cancel')} variant="ghost" onPress={close} />
            </View>
          ) : gateStep === 'choice' ? (
            <View style={styles.gateCard}>
              <Text style={styles.gateTag}>{placeLabel(gateCountry)}</Text>
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
          <ScrollView style={styles.gateScroll} contentContainerStyle={styles.gateCard} keyboardShouldPersistTaps="handled">
            {pending ? <Text style={styles.gateTag}>{pickSpec ? specName(pickSpec) : pending === 'appointments' ? t('tab.appointments') : pending === 'login' ? t('welcome.login') : t(`welcome.tile.${pending}`)}</Text> : null}
            <Text style={type.h2}>{pending === 'practitioner' || pending === 'structure' ? t('welcome.countryPro') : pending === 'login' ? t('welcome.countryLogin') : t('search.country')}</Text>
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
                      if (c.code !== gateCode) {
                        setGateCity(null);
                        setGateLocality(null);
                      }
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
            {(pending === 'patient' || pickSpec) && !gateOpen ? (
              <PlacePicker
                country={gateCode}
                city={gateCity}
                locality={gateLocality}
                onChange={(city, locality) => {
                  setGateCity(city);
                  setGateLocality(locality);
                }}
              />
            ) : null}
            <Button title={t('common.continue')} disabled={!gateCode} onPress={() => gateCode && choose(gateCode)} />
            <Button title={t('common.cancel')} variant="ghost" onPress={close} />
          </ScrollView>
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

/** Fond blanc, validé définitivement le 10 novembre 2026 (ancienne version vert pâle : archives/couleurs-vert-pale-2026-11). */
const HERO_BG = colors.white;
const HERO_LINE = '#E3EBE7';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  // Bandeau clair (vert très pâle) : le logo vert y reste bien visible.
  hero: {
    backgroundColor: HERO_BG,
    borderBottomWidth: 1,
    borderColor: HERO_LINE,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: -spacing.sm },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 118,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: HERO_LINE,
  },
  countryText: { flexShrink: 1, color: colors.navy, fontSize: 14, fontWeight: '700' },
  hello: { marginTop: spacing.sm, color: '#3D5263', fontSize: 14, fontWeight: '600' },
  slogan: { color: colors.navy, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  sloganAccent: { color: colors.green },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: HERO_LINE,
  },
  searchRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  searchInput: { flex: 1, fontSize: 16, color: colors.navy, paddingVertical: 10 },
  cancel: { color: colors.green, fontSize: 15, fontWeight: '700' },
  searchResults: { padding: spacing.xl },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  first: { marginTop: spacing.lg },
  specRail: { gap: spacing.sm, paddingRight: spacing.xl },
  spec: { width: 84, alignItems: 'center', gap: 6 },
  specIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  specName: { fontSize: 12, lineHeight: 15, fontWeight: '600', color: colors.navy, textAlign: 'center' },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, gap: spacing.sm },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1.5, borderColor: HERO_LINE },
  bookTitle: { fontSize: 14, fontWeight: '800' },
  bookText: { fontSize: 11 },
  bookArt: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rail: { gap: CARD_GAP, paddingRight: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { width: 18, backgroundColor: colors.green },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  seeAll: { fontSize: 14, fontWeight: '700', color: colors.green },
  newsCard: { width: CARD_W, height: 128, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.green },
  newsShade: { gap: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: 'rgba(15, 42, 71, 0.62)' },
  newsMeta: { fontSize: 11, fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)' },
  newsTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800', color: colors.white },
  newsRead: { marginTop: 2, fontSize: 12, fontWeight: '700', color: colors.gold },
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
  gateScroll: { flexGrow: 0, maxHeight: '88%', borderRadius: 18, backgroundColor: colors.white },
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
  proPill: { paddingHorizontal: spacing.sm, minHeight: 30, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.green, backgroundColor: colors.white },
  proPillText: { color: colors.green, fontSize: 12, fontWeight: '800' },
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
