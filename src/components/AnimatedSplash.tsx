import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Taille du cercle sur l'écran de démarrage natif (app.json → expo-splash-screen → imageWidth). */
const NATIVE_SIZE = 120;
/** Taille du cercle quand il devient le « O » d'Ollisanté. */
const RING = 80;
/** Durée d'affichage du logo complet et du slogan, pour qu'on ait le temps de les lire. */
const HOLD_MS = 3000;

/**
 * Ouverture de l'application : prend le relais de l'écran de démarrage natif (même cercle, même place).
 * « Bienvenue » apparaît, le grand cercle glisse à gauche et devient le « O », les lettres « llisanté » apparaissent
 * à côté : on lit « Ollisanté », puis le slogan apparaît dessous. Après quelques secondes, l'écran s'efface
 * (une fois la session chargée, `ready`).
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const [intro] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(0));
  const [textW, setTextW] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const [slogan] = useState(() => new Animated.Value(0));

  // L'animation démarre quand la largeur des lettres est connue (pour partir du cercle exactement centré).
  useEffect(() => {
    if (textW === null || started.current) return;
    started.current = true;
    void SplashScreen.hideAsync();
    Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 900, delay: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slogan, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => setShown(true), HOLD_MS);
    });
  }, [textW, intro, slogan]);

  useEffect(() => {
    if (!shown || !ready) return;
    Animated.timing(out, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setDone(true));
  }, [shown, ready, out]);

  if (done) return null;

  const half = (textW ?? 0) / 2;
  // Au départ, le cercle est seul et centré (comme l'écran natif) ; il glisse à gauche pour laisser la place aux lettres.
  const ringX = intro.interpolate({ inputRange: [0, 1], outputRange: [half, 0] });
  const ringScale = intro.interpolate({ inputRange: [0, 1], outputRange: [NATIVE_SIZE / RING, 1] });
  const lettersOpacity = intro.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] });
  const lettersX = intro.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const welcomeOpacity = intro.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const fade = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]} pointerEvents={shown && ready ? 'none' : 'auto'}>
      <View style={styles.center}>
        <Animated.Text style={[styles.welcome, { opacity: welcomeOpacity }]}>Bienvenue</Animated.Text>
        <View style={styles.row} accessible accessibilityLabel="Ollisanté">
          <Animated.Image
            source={require('../../assets/emblem.png')}
            style={[styles.ring, { transform: [{ translateX: ringX }, { scale: ringScale }] }]}
          />
          <Animated.View
            style={{ opacity: lettersOpacity, transform: [{ translateX: lettersX }] }}
            onLayout={(e) => textW === null && setTextW(e.nativeEvent.layout.width)}
          >
            <Text style={styles.word}>
              <Text style={styles.olli}>lli</Text>
              <Text style={styles.sante}>santé</Text>
            </Text>
          </Animated.View>
        </View>
        <Animated.Text
          style={[styles.slogan, { opacity: slogan, transform: [{ translateY: slogan.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
        >
          Votre rendez-vous médical, <Text style={styles.sante}>simplement</Text>
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // « Bienvenue » posé au-dessus du logo, sans le décaler : le logo reste au centre exact, comme l'écran natif.
  welcome: { position: 'absolute', top: '50%', marginTop: -RING / 2 - 64, fontSize: 22, fontWeight: '700', color: colors.navy, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // Le slogan, posé sous le logo sans le décaler.
  slogan: { position: 'absolute', top: '50%', marginTop: RING / 2 + 28, paddingHorizontal: 24, textAlign: 'center', fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.navy },
  ring: { width: RING, height: RING, marginRight: -4 },
  word: { fontSize: 62, lineHeight: 70, fontWeight: '800', letterSpacing: -1.5 },
  olli: { color: colors.navy },
  sante: { color: colors.green },
});
