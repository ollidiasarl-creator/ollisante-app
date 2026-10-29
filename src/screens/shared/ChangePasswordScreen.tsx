import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { changePassword } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

/** Compte → Mot de passe : l'ancien est demandé ; ensuite tous les appareils doivent se reconnecter. */
export default function ChangePasswordScreen() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (next.length < 8) return setError(t('password.tooShort'));
    if (next !== confirm) return setError(t('password.mismatch'));
    setError(null);
    setSaving(true);
    try {
      await changePassword(current, next);
      Alert.alert(t('password.changedTitle'), t('password.changedText'), [
        { text: t('common.ok'), onPress: () => void signOut() },
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={<Button title={t('common.save')} onPress={save} loading={saving} disabled={!current || !next} />}>
      <TextField label={t('password.current')} required value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <TextField label={t('password.new')} required value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint={t('password.rule')} />
      <TextField label={t('password.confirm')} required value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={error} />
      <Text style={type.small}>{t('password.signOutNote')}</Text>
    </Screen>
  );
}
