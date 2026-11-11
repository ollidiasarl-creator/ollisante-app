import React from 'react';
import { ImageBackground, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

/** Démo « images » de l'appli : une photo santé arrondie, avec un voile bleu nuit et un court texte. */
export const APP_IMAGES_DEMO = true;

export function PhotoCard({ source, title, text, height = 170 }: { source: ImageSourcePropType; title?: string; text?: string; height?: number }) {
  if (!APP_IMAGES_DEMO) return null;
  return (
    <ImageBackground source={source} style={[styles.card, { height }]} imageStyle={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors>
      {title ? (
        <View style={styles.shade}>
          <Text style={styles.title}>{title}</Text>
          {text ? <Text style={styles.text}>{text}</Text> : null}
        </View>
      ) : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.greenSoft },
  image: { borderRadius: 18 },
  shade: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, gap: 4, backgroundColor: 'rgba(15, 42, 71, 0.42)' },
  title: { color: colors.white, fontSize: 17, fontWeight: '800' },
  text: { color: '#E3EDF5', fontSize: 13, lineHeight: 18 },
});
