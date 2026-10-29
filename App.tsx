import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { OfflineBanner } from './src/components/OfflineBanner';
import { I18nProvider } from './src/i18n';
import { RootNavigator } from './src/navigation';

// L'écran natif reste affiché jusqu'à ce que l'animation du logo prenne le relais.
void SplashScreen.preventAutoHideAsync();

function Root() {
  const { status } = useAuth();
  return (
    <>
      <RootNavigator />
      <OfflineBanner />
      <AnimatedSplash ready={status !== 'loading'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Root />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
