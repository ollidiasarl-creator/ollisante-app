import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { getAppConfig } from '../api/endpoints';
import type { AppConfig } from '../api/types';
import { useI18n } from '../i18n';
import { spacing, type } from '../theme';
import { Button } from './ui';

/** « Discuter sur WhatsApp » (assistance, si un numéro est réglé) et « Urgence » (numéros d'urgence par pays). */
export function SupportButtons({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    getAppConfig().then(setConfig).catch(() => undefined);
  }, []);

  const whatsapp = config?.whatsappNumber?.replace(/\D/g, '');
  return (
    <View style={styles.block}>
      <Button title={t('support.emergency')} variant="warning" onPress={() => navigation.navigate('Emergency')} />
      {whatsapp ? (
        <>
          <Button
            title={t('support.whatsapp')}
            variant="secondary"
            onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(t('support.whatsappText'))}`)}
          />
          <Text style={type.small}>
            {config?.whatsappHours ? t('support.hours', { hours: config.whatsappHours }) : t('support.notEmergency')}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
});
