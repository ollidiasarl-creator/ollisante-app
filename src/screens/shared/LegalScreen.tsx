import React from 'react';
import { Linking } from 'react-native';
import { AccountRow, AccountSection } from '../../components/AccountList';
import { Screen } from '../../components/ui';
import { LEGAL_NOTICE_URL, PRIVACY_URL, TERMS_URL } from '../../config';
import { useI18n } from '../../i18n';

/** Confidentialité → Informations légales. */
export default function LegalScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <AccountSection>
        <AccountRow icon="document-text-outline" label={t('account.terms')} onPress={() => void Linking.openURL(TERMS_URL)} />
        <AccountRow icon="shield-outline" label={t('account.privacy')} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        <AccountRow icon="information-circle-outline" label={t('account.legalNotice')} onPress={() => void Linking.openURL(LEGAL_NOTICE_URL)} last />
      </AccountSection>
    </Screen>
  );
}
