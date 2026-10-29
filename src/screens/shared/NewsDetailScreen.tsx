import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { deleteNews } from '../../api/endpoints';
import type { Country, News } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { NewsArt, newsImage, useNewsMeta } from '../../components/NewsCards';
import { Button, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing, type } from '../../theme';

export default function NewsDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const news: News = route.params.news;
  const countries: Country[] = route.params.countries ?? [];
  const { t } = useI18n();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const meta = useNewsMeta(countries);
  const image = newsImage(news);

  function confirmDelete() {
    Alert.alert(t('news.deleteTitle'), t('news.deleteText'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('news.deleteYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNews(news.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  const height = Math.round((width - spacing.xl * 2) * 0.56);
  const picture = image ? (
    <Image
      source={{ uri: image }}
      style={[styles.image, { height }]}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={[styles.image, styles.art, { height: Math.round(height * 0.7) }]}>
      <NewsArt item={news} flagSize={72} />
    </View>
  );

  return (
    <Screen>
      {news.videoUrl && picture ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('news.watch')}
          onPress={() => void Linking.openURL(news.videoUrl!)}
        >
          {picture}
          <View style={styles.playOverlay}>
            <View style={styles.play}>
              <Ionicons name="play" size={30} color={colors.white} />
            </View>
          </View>
        </Pressable>
      ) : (
        picture
      )}
      <Text style={styles.meta}>{meta(news)}</Text>
      <Text style={type.title}>{news.title}</Text>
      {news.body ? <Text style={type.body}>{news.body}</Text> : null}
      {news.videoUrl ? (
        <Button title={t('news.watch')} onPress={() => void Linking.openURL(news.videoUrl!)} />
      ) : null}
      {news.linkUrl ? (
        <Button title={t('news.readMore')} variant="secondary" onPress={() => void Linking.openURL(news.linkUrl!)} />
      ) : null}
      {user?.role === 'ADMIN' ? <Button title={t('news.delete')} variant="warning" onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: radius.card, backgroundColor: colors.greenSoft },
  art: { overflow: 'hidden' },
  playOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 42, 71, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { fontSize: 14, fontWeight: '600', color: colors.green },
});
