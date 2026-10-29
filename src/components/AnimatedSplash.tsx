import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { MARK_CENTER_X, MARK_CENTER_Y, MARK_SIZE } from './Brand';

/** Taille de l'emblème sur l'écran de démarrage natif (app.json → expo-splash-screen → imageWidth). */
const NATIVE_SIZE = 120;

/**
 * Prend le relais de l'écran de démarrage natif (même emblème, même place) :
 * l'emblème pulse, puis glisse en haut à gauche jusqu'à sa place dans l'en-tête pendant que l'écran s'efface.
 * Il ne part qu'une fois `ready` (session chargée) pour ne jamais montrer d'écran intermédiaire.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(0)).current;
  const [pulsed, setPulsed] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  function start() {
    if (started.current) return;
    started.current = true;
    void SplashScreen.hideAsync();
    Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(
      () => setPulsed(true),
    );
  }

  useEffect(() => {
    if (!pulsed || !ready) return;
    Animated.timing(move, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(
      () => setDone(true),
    );
  }, [pulsed, ready, move]);

  if (done) return null;

  const pulseScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] });
  const scale = move.interpolate({ inputRange: [0, 1], outputRange: [1, MARK_SIZE / NATIVE_SIZE] });
  const translateX = move.interpolate({ inputRange: [0, 1], outputRange: [0, MARK_CENTER_X - width / 2] });
  const translateY = move.interpolate({ inputRange: [0, 1], outputRange: [0, insets.top + MARK_CENTER_Y - height / 2] });
  // Le fond s'efface pendant le trajet ; l'emblème disparaît à l'arrivée, sur celui de l'en-tête.
  const backdrop = move.interpolate({ inputRange: [0, 0.35, 0.85], outputRange: [1, 1, 0] });
  const markOpacity = move.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View style={styles.root} onLayout={start} pointerEvents={pulsed && ready ? 'none' : 'auto'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]} />
      <Animated.Image
        source={require('../../assets/emblem.png')}
        accessibilityLabel="Ollisanté"
        style={[
          styles.emblem,
          { opacity: markOpacity, transform: [{ translateX }, { translateY }, { scale }, { scale: pulseScale }] },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  backdrop: { backgroundColor: colors.white },
  emblem: { width: NATIVE_SIZE, height: NATIVE_SIZE, borderRadius: NATIVE_SIZE / 2 },
});
