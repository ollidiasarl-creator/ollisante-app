import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { startPatientSignup, verifyPatientSignup, type PatientSignup } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

/** Inscription patient par e-mail, étape 2 : saisie du code reçu pour confirmer l'adresse. */
export default function EmailVerifyScreen({ route, navigation }: { route: any; navigation: any }) {
  const signup: PatientSignup = route.params.signup;
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const handle = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(handle);
  }, [seconds]);

  async function submit() {
    if (!/^\d{6}$/.test(code)) {
      setError(t('otp.invalidFormat'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(await verifyPatientSignup(signup.email, code));
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
      await startPatientSignup(signup);
      setSeconds(60);
      setInfo(t('emailVerify.resent'));
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t('emailVerify.title')}</Text>
      <Text style={type.body}>{t('emailVerify.subtitle', { email: signup.email })}</Text>
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
      <Text style={type.small}>{t('emailVerify.spam')}</Text>
      {info ? <Banner kind="info" text={info} /> : null}
      {error ? <Banner text={error} /> : null}
      <Button title={t('otp.createAccount')} onPress={submit} loading={loading} />
      <Button
        title={seconds > 0 ? t('otp.resendIn', { seconds }) : t('otp.resend')}
        variant="ghost"
        disabled={seconds > 0}
        onPress={resend}
      />
      <Button
        title={t('emailVerify.usePhone')}
        variant="secondary"
        onPress={() => navigation.navigate('PhoneLogin', { profile: 'patient' })}
      />
    </Screen>
  );
}
