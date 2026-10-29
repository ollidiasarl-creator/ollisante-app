import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountries, getNews } from '../../api/endpoints';
import type { Country, News } from '../../api/types';
import { countryStore } from '../../auth/storage';
import { BrandMark } from '../../components/Brand';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { useNewsMeta } from '../../components/NewsCards';
import { Button } from '../../components/ui';
import { useI18n } from '../../i18n';
import { PROFILES, type Profile } from '../../lib/profiles';
import { colors, radius, spacing, type } from '../../theme';

/** Cartes d'actualités : largeur fixe pour un défilement automatique carte par carte. */
const CARD_WIDTH = 260;
const CARD_GAP = 12;
const AUTO_SCROLL_MS = 4000;

const TILES: Record<
  Profile,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    bg: string;
    fg: string;
  }
> = {
  patient: {
    icon: 'account-heart-outline',
    bg: colors.green,
    fg: colors.white,
  },
  practitioner: { icon: 'stethoscope', bg: colors.navy, fg: colors.white },
  structure: { icon: 'hospital-building', bg: colors.gold, fg: colors.navy },
};

/**
 * Ouverture, sans compte : l'emblème en haut à gauche (l'animation de démarrage l'y dépose), le pays, la langue et
 * « Se connecter » ; la recherche d'un médecin, les urgences et l'aide ; trois profils qui présentent le service
 * (sans mener d'emblée à la connexion), puis les actualités santé à faire défiler.
 */
export default function WelcomeScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [news, setNews] = useState<News[]>([]);
  const meta = useNewsMeta(countries);
  const name = (c: Country) => (lang === 'fr' ? c.nameFr : c.nameEn);
  const current = countries.find((c) => c.code === country);

  // Pays : celui choisi la dernière fois, sinon celui du téléphone s'il est proposé.
  useEffect(() => {
    let alive = true;
    Promise.all([getCountries(), countryStore.load()])
      .then(([list, saved]) => {
        if (!alive) return;
        setCountries(list);
        const region = getLocales()[0]?.regionCode ?? null;
        const initial = [saved, region].find((code) => code && list.some((c) => c.code === code)) ?? null;
        setCountry(initial);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Actualités : d'abord celles du pays choisi (et de toute l'Afrique), complétées par celles des autres pays.
  useEffect(() => {
    let alive = true;
    Promise.all([getNews({ countryCode: country, size: 10 }), country ? getNews({ size: 12 }) : null])
      .then(([local, all]) => {
        if (!alive) return;
        const seen = new Set(local.content.map((n) => n.id));
        setNews([...local.content, ...(all?.content ?? []).filter((n) => !seen.has(n.id))].slice(0, 12));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [country]);

  // Défilement automatique, carte par carte ; il s'arrête quelques secondes quand on fait glisser soi-même.
  const rail = useRef<FlatList<News>>(null);
  const index = useRef(0);
  const pausedUntil = useRef(0);
  useEffect(() => {
    index.current = 0;
    if (news.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      index.current = (index.current + 1) % news.length;
      rail.current?.scrollToIndex({ index: index.current, animated: true });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(timer);
  }, [news]);

  function choose(code: string) {
    setCountry(code);
    setPicking(false);
    void countryStore.save(code);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <BrandMark />
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('welcome.country')}
          onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.country, pressed && styles.pressed]}
        >
          <Text style={styles.countryCode}>{current ? current.code : '🌍'}</Text>
          <Text style={styles.countryName} numberOfLines={1}>
            {current ? name(current) : t('common.allCountries')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.navy} />
        </Pressable>
        <LanguageSwitch compact />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.main}>
          <Text style={styles.hero}>{t('welcome.hero')}</Text>
          <Text style={styles.lead}>{t('welcome.lead')}</Text>
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
          <View style={styles.quick}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Emergency')}
              style={({ pressed }) => [styles.chip, styles.chipUrgent, pressed && styles.pressed]}
            >
              <Ionicons name="call" size={16} color={colors.orange} />
              <Text style={[styles.chipText, { color: colors.orange }]}>{t('welcome.emergency')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Faq')}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Ionicons name="help-circle-outline" size={17} color={colors.navy} />
              <Text style={styles.chipText}>{t('welcome.help')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('EmailLogin')}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Ionicons name="log-in-outline" size={17} color={colors.navy} />
              <Text style={styles.chipText}>{t('welcome.login')}</Text>
            </Pressable>
          </View>
          <Text style={styles.iam}>{t('welcome.iam')}</Text>
          {PROFILES.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              onPress={() =>
                p === 'patient'
                  ? navigation.navigate('BookFacility', {
                      countryCode: country,
                    })
                  : navigation.navigate('ProInfo', { profile: p })
              }
              style={({ pressed }) => [styles.tile, { backgroundColor: TILES[p].bg }, pressed && styles.tilePressed]}
            >
              <View style={[styles.tileIcon, p === 'structure' && styles.tileIconLight]}>
                <MaterialCommunityIcons name={TILES[p].icon} size={28} color={TILES[p].fg} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.tileTitle, { color: TILES[p].fg }]}>{t(`welcome.tile.${p}`)}</Text>
                <Text style={[styles.tileText, { color: TILES[p].fg }]}>{t(`welcome.tile.${p}.text`)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={TILES[p].fg} />
            </Pressable>
          ))}
        </View>

        {news.length > 0 ? (
          <View style={styles.news}>
            <Text style={styles.newsTitle}>{t('welcome.news')}</Text>
            <FlatList
              ref={rail}
              horizontal
              data={news}
              keyExtractor={(n) => n.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              getItemLayout={(_, i) => ({
                length: CARD_WIDTH + CARD_GAP,
                offset: (CARD_WIDTH + CARD_GAP) * i,
                index: i,
              })}
              onScrollBeginDrag={() => {
                pausedUntil.current = Date.now() + 8000;
              }}
              onMomentumScrollEnd={(e) => {
                index.current = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
              }}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('NewsDetail', { news: item, countries })}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {meta(item)}
                  </Text>
                  <Text style={styles.cardTitle} numberOfLines={3}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={[type.h2, styles.modalTitle]}>{t('welcome.country')}</Text>
          <FlatList
            data={countries}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.code === country }}
                onPress={() => choose(item.code)}
                style={[styles.row, item.code === country && styles.rowOn]}
              >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  country: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCode: { fontSize: 12, fontWeight: '800', color: colors.green },
  countryName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  scroll: { flexGrow: 1, paddingTop: spacing.lg, gap: spacing.lg },
  main: { gap: spacing.md, paddingHorizontal: spacing.xl },
  hero: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.navy },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginTop: -spacing.xs,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#F6F8F7',
  },
  searchText: { flex: 1, fontSize: 16, color: colors.muted },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipUrgent: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  iam: { ...type.h2, marginTop: spacing.sm, marginBottom: spacing.xs },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 88,
    paddingHorizontal: spacing.xl,
    borderRadius: 22,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tileIconLight: { backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  tileTitle: { fontSize: 20, fontWeight: '800' },
  tileText: { fontSize: 14, marginTop: 2 },
  news: { paddingBottom: spacing.md, gap: spacing.sm },
  newsTitle: {
    ...type.label,
    fontWeight: '800',
    paddingHorizontal: spacing.xl,
  },
  rail: { gap: CARD_GAP, paddingHorizontal: spacing.xl },
  card: {
    width: CARD_WIDTH,
    minHeight: 104,
    gap: 6,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: '#F6F8F7',
  },
  cardMeta: { fontSize: 12, fontWeight: '700', color: colors.green },
  cardTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.navy,
  },
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
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
