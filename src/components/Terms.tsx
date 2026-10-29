import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '../config';
import { useI18n } from '../i18n';
import { colors, type } from '../theme';
import { Checkbox } from './ui';

/** Consentement obligatoire avant toute création de compte (données de santé). */
export function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Checkbox checked={checked} onChange={onChange}>
      <Text style={type.body}>
        {t('terms.accept')}
        <Text style={TERMS_URL ? styles.link : undefined} onPress={TERMS_URL ? () => void Linking.openURL(TERMS_URL) : undefined}>
          {` ${t('terms.terms')}`}
        </Text>
        <Text
          style={PRIVACY_URL ? styles.link : undefined}
          onPress={PRIVACY_URL ? () => void Linking.openURL(PRIVACY_URL) : undefined}
        >
          {` ${t('terms.privacy')}`}
        </Text>
      </Text>
    </Checkbox>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.green, fontWeight: '700', textDecorationLine: 'underline' },
});
