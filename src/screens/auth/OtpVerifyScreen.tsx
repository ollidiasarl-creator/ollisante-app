import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '../../api/client';
import { requestOtp, verifyOtp } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { TermsConsent } from '../../components/Terms';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

export default function OtpVerifyScreen({ route }: { route: any }) {
  const phone: string = route.params.phone;
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [needNames, setNeedNames] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (needNames && (!firstName.trim() || !lastName.trim())) {
      setError(t('err.NOM_REQUIS'));
      return;
    }
    if (needNames && !accepted) {
      setError(t('terms.required'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await verifyOtp({
        phone,
        code,
        firstName: needNames ? firstName.trim() : undefined,
        lastName: needNames ? lastName.trim() : undefined,
        locale: lang,
      });
      await signIn(response);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NOM_REQUIS') {
        // Premier compte : le code reste valable, il manque seulement le nom.
        setNeedNames(true);
        setError(null);
      } else {
        setError(errorMessage(e, t));
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await requestOtp(phone, lang);
      setSeconds(60);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t('otp.title')}</Text>
      <Text style={type.body}>{t('otp.subtitle', { phone })}</Text>
      <TextField
        label={t('otp.code')} required
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
      />
      {needNames ? (
        <>
          <Text style={type.h3}>{t('otp.lastStep')}</Text>
          <TextField label={t('field.firstName')} required value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoComplete="given-name" />
          <TextField label={t('field.lastName')} required value={lastName} onChangeText={setLastName} autoCapitalize="words" autoComplete="family-name" />
          <TermsConsent checked={accepted} onChange={setAccepted} />
        </>
      ) : null}
      {error ? <Banner text={error} /> : null}
      <Button title={needNames ? t('otp.createAccount') : t('otp.confirm')} onPress={submit} loading={loading} />
      <Button
        title={seconds > 0 ? t('otp.resendIn', { seconds }) : t('otp.resend')}
        variant="ghost"
        disabled={seconds > 0}
        onPress={resend}
      />
    </Screen>
  );
}
