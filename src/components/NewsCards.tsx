import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Country, News } from '../api/types';
import { useI18n } from '../i18n';
import { mediaUrl, videoThumbnail } from '../lib/media';
import { colors, radius, spacing, type } from '../theme';

/** Image à afficher pour une actualité : sa photo, sinon l'aperçu de sa vidéo YouTube. */
export function newsImage(n: News): string | null {
  if (n.imageUrl) return mediaUrl(n.imageUrl);
  return n.videoUrl ? videoThumbnail(n.videoUrl) : null;
}

/** Couleurs de la charte pour les actualités sans photo (toutes lisibles avec un texte blanc). */
const NEWS_COLORS = [colors.green, colors.terracotta, colors.navy];

/** Couleur stable pour une actualité donnée (même couleur à chaque affichage). */
export function newsColor(n: News): string {
  let hash = 0;
  for (const ch of n.id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return NEWS_COLORS[Math.abs(hash) % NEWS_COLORS.length];
}

/** Drapeau du pays (🇸🇳…), ou 🌍 pour une actualité qui concerne toute l'Afrique. */
export function newsFlag(n: News): string {
  const code = n.countryCode;
  if (!code || !/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Visuel d'une actualité sans photo : aplat de couleur, cercles décoratifs et drapeau. */
export function NewsArt({ item, flagSize }: { item: News; flagSize: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.art, { backgroundColor: newsColor(item) }]}>
      <View style={[styles.artCircle, styles.artCircleBig]} />
      <View style={[styles.artCircle, styles.artCircleSmall]} />
      <Text style={{ fontSize: flagSize }}>{newsFlag(item)}</Text>
    </View>
  );
}

/** « 15 oct. · Sénégal » ou « 15 oct. · Toute l'Afrique ». */
export function useNewsMeta(countries: Country[]) {
  const { t, lang, locale } = useI18n();
  return (n: News) => {
    const c = n.countryCode ? countries.find((x) => x.code === n.countryCode) : null;
    const where = n.countryCode ? (c ? (lang === 'fr' ? c.nameFr : c.nameEn) : n.countryCode) : t('news.allAfrica');
    const date = new Date(n.publishedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `${date} · ${where}`;
  };
}

function PlayBadge({ size }: { size: number }) {
  return (
    <View style={[styles.play, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="play" size={size * 0.5} color={colors.white} />
    </View>
  );
}

/** Bandeau « À la une » : les dernières actualités défilent toutes seules, et au doigt. */
export function NewsCarousel({
  items,
  width,
  meta,
  onOpen,
}: {
  items: News[];
  width: number;
  meta: (n: News) => string;
  onOpen: (n: News) => void;
}) {
  const list = useRef<FlatList<News>>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const touching = useRef(false);

  function show(i: number) {
    indexRef.current = i;
    setIndex(i);
  }

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      if (touching.current) return;
      const next = (indexRef.current + 1) % items.length;
      list.current?.scrollToOffset({ offset: next * width, animated: true });
      show(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length, width]);

  if (items.length === 0) return null;
  const height = Math.round(width * 0.56);

  return (
    <View>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(n) => n.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          show(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const image = newsImage(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => onOpen(item)}
              style={[styles.slide, { width, height }]}
            >
              {image ? (
                <>
                  <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.slideShade} />
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.slideArt]}>
                  <NewsArt item={item} flagSize={64} />
                </View>
              )}
              {item.videoUrl ? (
                <View style={styles.slidePlay}>
                  <PlayBadge size={52} />
                </View>
              ) : null}
              <View style={styles.slideText}>
                <Text style={styles.slideMeta}>{meta(item)}</Text>
                <Text style={styles.slideTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((n, i) => (
            <View key={n.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function NewsRow({ item, meta, onPress }: { item: News; meta: string; onPress: () => void }) {
  const image = newsImage(item);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <NewsArt item={item} flagSize={34} />
        )}
        {item.videoUrl ? <PlayBadge size={28} /> : null}
      </View>
      <View style={styles.rowText}>
        <Text style={type.h3} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={type.small} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slide: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.greenSoft, justifyContent: 'flex-end' },
  slideShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 42, 71, 0.35)' },
  slidePlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  slideText: { padding: spacing.lg, gap: spacing.xs },
  slideMeta: { fontSize: 13, fontWeight: '600', color: colors.white },
  slideTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.white },
  slideArt: { justifyContent: 'flex-start' },
  art: { alignItems: 'flex-end', justifyContent: 'flex-start', padding: spacing.md, overflow: 'hidden' },
  artCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  artCircleBig: { width: '90%', aspectRatio: 1, right: '-35%', bottom: '-55%' },
  artCircleSmall: { width: '45%', aspectRatio: 1, left: '-15%', top: '-20%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.green, width: 18 },
  play: { backgroundColor: 'rgba(15, 42, 71, 0.7)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.7 },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.input,
    overflow: 'hidden',
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  meta: { fontSize: 13, fontWeight: '600', color: colors.green, marginTop: 2 },
});
