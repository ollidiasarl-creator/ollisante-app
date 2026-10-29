import React, { useState } from 'react';
import { Text } from 'react-native';
import { isLoginChallenge, loginWithPassword, verifyAdminLogin, type LoginChallenge } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

/** Double authentification (administrateurs et comptes qui l'ont activée) : code à 6 chiffres reçu par e-mail. */
export default function AdminCodeScreen({ route }: { route: any }) {
  const { identifier, password } = route.params as { identifier: string; password: string };
  const [challenge, setChallenge] = useState<LoginChallenge>(route.params.challenge);
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    if (!/^\d{6}$/.test(code)) return setError(t('otp.invalidFormat'));
    setLoading(true);
    setError(null);
    try {
      await signIn((await verifyAdminLogin(challenge.challengeId, code)).auth);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      const result = await loginWithPassword(identifier, password);
      if (isLoginChallenge(result)) {
        setChallenge(result);
        setCode('');
        setInfo(t('emailVerify.resent'));
      } else {
        await signIn(result);
      }
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t('adminCode.title')}</Text>
      <Text style={type.body}>{t('adminCode.subtitle', { email: challenge.emailHint })}</Text>
      <TextField
        label={t('emailVerify.code')}
        required
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      {info ? <Banner kind="info" text={info} /> : null}
      {error ? <Banner text={error} /> : null}
      <Button title={t('otp.confirm')} onPress={submit} loading={loading} />
      <Button title={t('otp.resend')} variant="ghost" onPress={resend} />
    </Screen>
  );
}
