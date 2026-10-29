import React, { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { getProfile, updateProfile } from '../../api/endpoints';
import type { Profile } from '../../api/types';
import { AccountRow, AccountSection } from '../../components/AccountList';
import { Button, Checkbox, Loading, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

/**
 * Compte médecin → Mon profil professionnel. Identité, numéro d'ordre et spécialités sont vérifiés par l'équipe
 * (affichés seulement) ; la présentation et la téléconsultation se modifient ici.
 */
export default function PractitionerProfileScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState('');
  const [video, setVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setBio(p.practitioner?.bio ?? '');
        setVideo(p.practitioner?.teleconsultationEnabled ?? false);
      })
      .catch((e) => Alert.alert(t('common.error'), errorMessage(e, t)));
  }, [t]);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ bio, teleconsultationEnabled: video });
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  }

  const pr = profile?.practitioner;
  if (!pr) return <Loading />;
  return (
    <Screen footer={<Button title={t('common.save')} onPress={save} loading={saving} />}>
      <AccountSection title={t('pro.verifiedInfo')}>
        <AccountRow icon="person-outline" label={`Dr ${pr.firstName} ${pr.lastName}`} />
        <AccountRow
          icon="medkit-outline"
          label={t('pro.specialties')}
          value={pr.specialties.map((s) => (lang === 'fr' ? s.nameFr : s.nameEn)).join(', ') || '—'}
        />
        <AccountRow icon="ribbon-outline" label={t('pro.license')} value={pr.licenseNumber ?? '—'} />
        <AccountRow
          icon={pr.verificationStatus === 'VERIFIED' ? 'checkmark-circle-outline' : 'hourglass-outline'}
          label={t('pro.status')}
          value={t(`pro.status.${pr.verificationStatus}`)}
          last
        />
      </AccountSection>
      <Text style={type.small}>{t('pro.changeInfo')}</Text>
      <TextField
        label={t('pro.bio')}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={2000}
        placeholder={t('pro.bioHint')}
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <Checkbox checked={video} onChange={setVideo}>
        <Text style={type.body}>{t('pro.teleconsultation')}</Text>
      </Checkbox>
    </Screen>
  );
}
