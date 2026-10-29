import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text } from 'react-native';
import { getProfile, updateProfile } from '../../api/endpoints';
import type { Profile } from '../../api/types';
import { AccountRow, AccountSection } from '../../components/AccountList';
import { Loading, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, type } from '../../theme';

/** Confidentialité → Mes préférences : rappels de rendez-vous par e-mail et par SMS. */
export default function PreferencesScreen() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile).catch((e) => Alert.alert(t('common.error'), errorMessage(e, t)));
  }, [t]);

  async function toggle(key: 'notifyEmail' | 'notifySms') {
    if (!profile) return;
    try {
      setProfile(await updateProfile({ [key]: !profile[key] }));
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    }
  }

  if (!profile) return <Loading />;
  return (
    <Screen>
      <Text style={type.small}>{t('prefs.intro')}</Text>
      <AccountSection title={t('prefs.reminders')}>
        <AccountRow
          icon="mail-outline"
          label={t('prefs.email')}
          right={<Switch value={profile.notifyEmail} onValueChange={() => void toggle('notifyEmail')} trackColor={{ true: colors.green }} />}
        />
        <AccountRow
          icon="chatbubble-outline"
          label={t('prefs.sms')}
          right={<Switch value={profile.notifySms} onValueChange={() => void toggle('notifySms')} trackColor={{ true: colors.green }} />}
          last
        />
      </AccountSection>
    </Screen>
  );
}
