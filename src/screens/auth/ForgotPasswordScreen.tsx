import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { forgotPassword, resetPassword } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail } from '../../lib/format';
import { type } from '../../theme';

/** Mot de passe oublié : 1) l'adresse e-mail, 2) le code reçu et le nouveau mot de passe (puis connexion). */
export default function ForgotPasswordScreen({ route }: { route: any }) {
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const handle = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(handle);
  }, [seconds]);

  async function sendCode() {
    if (!isEmail(email)) return setError(t('reset.emailInvalid'));
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase(), lang);
      setSent(true);
      setSeconds(60);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!/^\d{6}$/.test(code)) return setError(t('otp.invalidFormat'));
    if (password.length < 8) return setError(t('password.tooShort'));
    setLoading(true);
    setError(null);
    try {
      await signIn(await resetPassword({ email: email.trim().toLowerCase(), code, newPassword: password }));
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  if (!sent) {
    return (
      <Screen>
        <Text style={type.title}>{t('reset.title')}</Text>
        <Text style={type.body}>{t('reset.intro')}</Text>
        <TextField
          label={t('field.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        {error ? <Banner text={error} /> : null}
        <Button title={t('reset.send')} onPress={sendCode} loading={loading} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={type.title}>{t('reset.newTitle')}</Text>
      <Banner kind="info" text={t('reset.sent', { email: email.trim().toLowerCase() })} />
      <TextField
        label={t('reset.code')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <TextField
        label={t('reset.newPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        hint={t('password.hint')}
      />
      {error ? <Banner text={error} /> : null}
      <Button title={t('reset.save')} onPress={submit} loading={loading} />
      <Button
        title={seconds > 0 ? t('otp.resendIn', { seconds }) : t('otp.resend')}
        variant="ghost"
        disabled={seconds > 0 || loading}
        onPress={sendCode}
      />
    </Screen>
  );
}
