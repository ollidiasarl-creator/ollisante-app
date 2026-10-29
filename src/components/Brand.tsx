import React from 'react';
import { Image } from 'react-native';

/**
 * Signature visuelle : le O à la carte de l'Afrique, en haut à gauche de chaque écran.
 * L'animation d'ouverture fait glisser l'emblème du centre de l'écran jusqu'à cette place.
 */
export const MARK_SIZE = 32;
/** Centre de l'emblème, mesuré depuis le bord gauche et depuis le haut de la zone sûre (barre d'en-tête de 44 pt). */
export const MARK_CENTER_X = 16 + MARK_SIZE / 2;
export const MARK_CENTER_Y = 22;

export function BrandMark({ size = MARK_SIZE }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/emblem.png')}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel="Ollisanté"
    />
  );
}
