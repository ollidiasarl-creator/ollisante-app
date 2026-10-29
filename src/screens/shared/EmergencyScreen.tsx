import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { getCountries } from '../../api/endpoints';
import type { Country } from '../../api/types';
import { Button, Loading, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors, radius, spacing, type } from '../../theme';

/** Urgence médicale : rappel d'appeler les secours, et numéros vérifiés par l'équipe pour chaque pays. */
export default function EmergencyScreen() {
  const { t, lang } = useI18n();
  const [countries, setCountries] = useState<Country[] | null>(null);
  useEffect(() => {
    getCountries()
      .then((list) => setCountries(list.filter((c) => c.emergencyNumber)))
      .catch(() => setCountries([]));
  }, []);

  return (
    <Screen>
      <View style={styles.alert}>
        <Text style={type.h2}>{t('emergency.title')}</Text>
        <Text style={type.body}>{t('emergency.text')}</Text>
      </View>
      {countries === null ? <Loading /> : null}
      {countries?.map((c) => (
        <Button
          key={c.code}
          title={t('emergency.call', { country: lang === 'fr' ? c.nameFr : c.nameEn, number: c.emergencyNumber ?? '' })}
          variant="warning"
          onPress={() => void Linking.openURL(`tel:${c.emergencyNumber!.replace(/\s/g, '')}`)}
        />
      ))}
      {countries && countries.length === 0 ? <Text style={type.body}>{t('emergency.none')}</Text> : null}
      <Text style={type.small}>{t('emergency.note')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: {
    backgroundColor: colors.orangeSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
