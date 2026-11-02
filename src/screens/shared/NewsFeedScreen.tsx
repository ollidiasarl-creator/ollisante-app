import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getCountries, getNews } from '../../api/endpoints';
import type { Country, News } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { NewsCarousel, NewsRow, newsImage, useNewsMeta } from '../../components/NewsCards';
import { Banner, Button, CountryPicker, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { userCountry } from '../../lib/userCountry';
import { colors, spacing, type } from '../../theme';

const PADDING = spacing.xl;
const FEATURED = 3;

/** Accueil : actualités santé (toute l'Afrique + le pays choisi), les plus récentes illustrées en tête. */
export default function NewsFeedScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [accountCountry, setAccountCountry] = useState<string | null>(null);
  const [items, setItems] = useState<News[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const meta = useNewsMeta(countries);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
    // Par défaut, les actualités du pays du compte ; « Tous les pays » reste au choix.
    if (user && user.role !== 'ADMIN') {
      userCountry()
        .then((code) => {
          if (!code) return;
          setAccountCountry(code);
          setCountry(code);
        })
        .catch(() => undefined);
    }
  }, [user]);

  const load = useCallback(
    async (pageToLoad: number, mode: 'initial' | 'refresh' | 'more') => {
      sequence.current += 1;
      const mine = sequence.current;
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setError(null);
      try {
        const result = await getNews({ countryCode: country, page: pageToLoad, size: 20 });
        if (mine !== sequence.current) return;
        setItems((previous) => (pageToLoad === 0 ? result.content : [...previous, ...result.content]));
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (e) {
        if (mine === sequence.current) setError(errorMessage(e, t));
      } finally {
        if (mine === sequence.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [country, t],
  );

  // Recharge en revenant sur l'onglet (ex. après la publication d'une actualité).
  useFocusEffect(
    useCallback(() => {
      void load(0, 'initial');
    }, [load]),
  );

  const open = (n: News) => navigation.navigate('NewsDetail', { news: n, countries });
  // À la une : les plus récentes, celles avec photo ou vidéo en priorité ; les autres ont un visuel coloré.
  const featured = [...items.filter((n) => newsImage(n) !== null), ...items.filter((n) => newsImage(n) === null)]
    .slice(0, FEATURED);
  const rest = items.filter((n) => !featured.includes(n));

  const header = (
    <View style={styles.header}>
      {isAdmin ? <Button title={t('news.publish')} onPress={() => navigation.navigate('PublishNews')} /> : null}
      {/* Hors administrateur, les actualités sont celles du pays du compte : pas de choix de pays. */}
      {isAdmin || !accountCountry ? (
        <CountryPicker label={t('news.country')} countries={countries} value={country} onChange={setCountry} allowAll />
      ) : null}
      {error ? <Banner text={error} /> : null}
      {featured.length > 0 ? (
        <>
          <Text style={type.h2}>{t('news.featured')}</Text>
          <NewsCarousel items={featured} width={width - PADDING * 2} meta={meta} onOpen={open} />
        </>
      ) : null}
      {rest.length > 0 ? <Text style={[type.h2, styles.listTitle]}>{t('news.latest')}</Text> : null}
    </View>
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={rest}
      keyExtractor={(n) => n.id}
      refreshing={refreshing}
      onRefresh={() => void load(0, 'refresh')}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <NewsRow item={item} meta={meta(item)} onPress={() => open(item)} />}
      ListEmptyComponent={
        items.length === 0 && !error ? <EmptyState title={t('news.emptyTitle')} text={t('news.emptyText')} /> : null
      }
      ListFooterComponent={
        page + 1 < totalPages ? (
          <Button
            title={t('news.more')}
            variant="secondary"
            loading={loadingMore}
            onPress={() => void load(page + 1, 'more')}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: PADDING, gap: spacing.xs },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  listTitle: { marginTop: spacing.md },
  separator: { height: 1, backgroundColor: colors.border },
});
