import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { type Profile, registerRoute } from '../../lib/profiles';
import { colors, spacing, type } from '../../theme';

const POINTS: Record<Exclude<Profile, 'patient'>, number> = { practitioner: 3, structure: 3 };

/** Présentation pour les médecins et les structures, avant de leur proposer l'inscription ou la connexion. */
export default function ProInfoScreen({ route, navigation }: { route: any; navigation: any }) {
  const profile: Exclude<Profile, 'patient'> = route.params?.profile === 'structure' ? 'structure' : 'practitioner';
  const { t } = useI18n();
  return (
    <Screen>
      <Text style={type.title}>{t(`pro.${profile}.title`)}</Text>
      {Array.from({ length: POINTS[profile] }, (_, i) => (
        <View key={i} style={styles.point}>
          <Ionicons name="checkmark-circle" size={22} color={colors.green} />
          <Text style={[type.body, styles.flex]}>{t(`pro.${profile}.p${i + 1}`)}</Text>
        </View>
      ))}
      <Text style={type.small}>{t('pro.note')}</Text>
      <Button title={t(`welcome.register.${profile}`)} onPress={() => navigation.navigate(registerRoute(profile))} />
      <Button title={t('welcome.login')} variant="secondary" onPress={() => navigation.navigate('EmailLogin', { profile })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
});
