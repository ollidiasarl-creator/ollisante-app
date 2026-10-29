import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountries, getFaq, getNews, getProfile, getSpecialties } from '../../api/endpoints';
import type { Country, FaqEntry, News, Specialty } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { countryStore } from '../../auth/storage';
import { Button, SelectPicker } from '../../components/ui';
import { useI18n } from '../../i18n';
import { exactSpecialty, fold, frequentSpecialties, matchSpecialties, rank, suggest, suggestSpecialties, suggestTopics } from '../../lib/search';

/** Les correspondances par début de mot d'abord, puis celles trouvées dans le texte, sans doublon. */
const merge = <T,>(first: T[], then: T[]) => [...first, ...then.filter((x) => !first.includes(x))];
import { colors, radius, spacing, type } from '../../theme';

interface Shortcut {
  title: string;
  keywords: string;
  go: () => void;
}

/**
 * Recherche générale, comme sur le site : spécialités (par leur nom ou un mot courant), pages utiles, questions
 * fréquentes et actualités. Une spécialité demande d'abord le pays, puis la connexion si besoin.
 */
export default function SearchScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const guest = useAuth().status === 'signedOut';
  const [text, setText] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [faq, setFaq] = useState<FaqEntry[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [accountCountry, setAccountCountry] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [asking, setAsking] = useState<Specialty | null>(null);

  useEffect(() => {
    getSpecialties().then(setSpecialties).catch(() => undefined);
    getFaq('PATIENT').then(setFaq).catch(() => undefined);
    getNews({ size: 50 }).then((p) => setNews(p.content)).catch(() => undefined);
    getCountries().then(setCountries).catch(() => undefined);
    if (!guest) getProfile().then((p) => setAccountCountry(p.countryCode ?? null)).catch(() => undefined);
  }, [guest]);

  const shortcuts: Shortcut[] = [
    { title: t('emergency.screen'), keywords: 'urgence urgences urgent samu ambulance secours accident emergency', go: () => navigation.navigate('Emergency') },
    { title: t('account.helpTitle'), keywords: 'aide question contact whatsapp support probleme assistance help', go: () => navigation.navigate('Faq') },
    ...(guest
      ? [
          { title: t('welcome.login'), keywords: 'compte connexion connecter inscription inscrire mot passe account login', go: () => navigation.navigate('EmailLogin') },
          { title: t('pro.practitioner.title'), keywords: 'medecin docteur professionnel rejoindre inscrire cabinet doctor', go: () => navigation.navigate('ProInfo', { profile: 'practitioner' }) },
          { title: t('pro.structure.title'), keywords: 'clinique hopital structure etablissement centre sante rejoindre facility', go: () => navigation.navigate('ProInfo', { profile: 'structure' }) },
        ]
      : []),
  ];

  const term = fold(text);
  // Dès la première lettre : ce qui commence par ces lettres d'abord, puis (à partir de 3 lettres) ce qui les contient.
  const topics = term ? suggestTopics(text).slice(0, 5) : [];
  const specs = useMemo(
    () => (term ? merge(suggestSpecialties(text, specialties), matchSpecialties(text, specialties)) : frequentSpecialties(specialties)),
    [term, text, specialties],
  );
  const pages = term ? merge(suggest(text, shortcuts, (s) => s.title, (s) => s.keywords), rank(text, shortcuts, (s) => `${s.title} ${s.keywords}`)) : [];
  const answers = term ? merge(suggest(text, faq, (f) => f.questionFr), rank(text, faq, (f) => `${f.questionFr} ${f.answerFr}`)).slice(0, 5) : [];
  const articles = term ? merge(suggest(text, news, (n) => n.title), rank(text, news, (n) => `${n.title} ${n.body ?? ''}`)).slice(0, 4) : [];
  const nothing = !!term && !topics.length && !specs.length && !pages.length && !answers.length && !articles.length;
  const specName = (s: Specialty) => (lang === 'fr' ? s.nameFr : s.nameEn);

  function book(s: Specialty) {
    if (!guest && accountCountry) {
      navigation.navigate('BookAgenda', { countryCode: accountCountry, specialty: s });
      return;
    }
    setAsking(s);
  }
  function chooseCountry(code: string) {
    const s = asking!;
    setAsking(null);
    void countryStore.save(code);
    if (guest) navigation.navigate('EmailLogin', { profile: 'patient', toBook: true });
    else navigation.navigate('BookAgenda', { countryCode: code, specialty: s });
  }

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.muted}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => {
            const s = exactSpecialty(text, specialties);
            if (s) book(s);
          }}
        />
        {text ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {topics.length ? (
          <View style={styles.block}>
            <Text style={styles.head}>{t('search.topics')}</Text>
            {topics.map((x) => (
              <Pressable key={x} accessibilityRole="button" onPress={() => setText(x)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <Ionicons name="pricetag-outline" size={18} color={colors.green} />
                <Text style={[type.label, styles.flex]}>{x}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.head}>{t('search.book')}</Text>
          <SelectPicker
            label={t('search.allSpecialties')}
            options={[...specialties]
              .sort((a, b) => specName(a).localeCompare(specName(b), lang))
              .map((s) => ({ value: s.code, label: specName(s) }))}
            value={null}
            placeholder={t('search.pickSpecialty')}
            onChange={(code) => {
              const s = specialties.find((x) => x.code === code);
              if (s) book(s);
            }}
          />
          {specs.map((s) => (
            <Pressable key={s.code} accessibilityRole="button" onPress={() => book(s)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <Ionicons name="medkit-outline" size={18} color={colors.green} />
              <Text style={[type.label, styles.flex]}>{specName(s)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {pages.length || answers.length ? (
          <View style={styles.block}>
            <Text style={styles.head}>{t('search.info')}</Text>
            {pages.map((p) => (
              <Pressable key={p.title} accessibilityRole="button" onPress={p.go} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <Text style={[type.label, styles.flex]}>{p.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
            {answers.map((f) => (
              <Pressable key={f.id} accessibilityRole="button" accessibilityState={{ expanded: openFaq === f.id }} onPress={() => setOpenFaq(openFaq === f.id ? null : f.id)} style={styles.item}>
                <View style={styles.flex}>
                  <Text style={type.label}>{f.questionFr}</Text>
                  {openFaq === f.id ? <Text style={[type.body, styles.answer]}>{f.answerFr}</Text> : null}
                </View>
                <Ionicons name={openFaq === f.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {articles.length ? (
          <View style={styles.block}>
            <Text style={styles.head}>{t('search.news')}</Text>
            {articles.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" onPress={() => navigation.navigate('NewsDetail', { news: n, countries })} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <Text style={[type.label, styles.flex]}>{n.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {nothing ? <Text style={type.body}>{t('search.none')}</Text> : null}
      </ScrollView>

      <Modal visible={!!asking} animationType="slide" onRequestClose={() => setAsking(null)}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHead}>
            <Text style={styles.tag}>{asking ? specName(asking) : ''}</Text>
            <Text style={type.h2}>{t('search.country')}</Text>
          </View>
          <FlatList
            data={countries}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => chooseCountry(item.code)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={type.body}>{lang === 'fr' ? item.nameFr : item.nameEn}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            )}
          />
          <View style={styles.modalFooter}>
            {guest ? <Text style={type.small}>{t('search.thenLogin')}</Text> : null}
            <Button title={t('common.close')} variant="secondary" onPress={() => setAsking(null)} />
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: 0,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  input: { flex: 1, fontSize: 16, color: colors.navy, paddingVertical: 10 },
  content: { padding: spacing.xl, gap: spacing.xl },
  block: { gap: spacing.sm },
  head: { ...type.label, fontWeight: '800', color: colors.green },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  answer: { marginTop: spacing.sm },
  modalHead: { padding: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs },
  tag: { fontSize: 13, fontWeight: '800', color: colors.green, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalFooter: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
