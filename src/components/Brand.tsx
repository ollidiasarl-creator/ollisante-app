import React from 'react';
import { Image } from 'react-native';

/**
 * Signature visuelle : le logo « L'accueil » (cercle ouvert et point doré), en haut à gauche de chaque écran.
 * L'animation d'ouverture fait glisser l'emblème du centre de l'écran jusqu'à cette place.
 */
export const MARK_SIZE = 32;
/** Centre de l'emblème, mesuré depuis le bord gauche et depuis le haut de la zone sûre (barre d'en-tête de 44 pt). */
export const MARK_CENTER_X = 16 + MARK_SIZE / 2;
export const MARK_CENTER_Y = 22;

/** {@code onDark} : cercle blanc (et point doré), pour les bandeaux verts. */
export function BrandMark({ size = MARK_SIZE, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <Image
      source={onDark ? require('../../assets/emblem-white.png') : require('../../assets/emblem.png')}
      style={{ width: size, height: size }}
      accessibilityLabel="Ollisanté"
    />
  );
}
