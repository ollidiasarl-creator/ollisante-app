import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getCountries, isLoginChallenge, loginWithPassword, requestOtp } from '../../api/endpoints';
import type { Country } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, CountryPicker, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { toInternational } from '../../lib/format';
import { type Profile, phoneUsesPassword, registerRoute } from '../../lib/profiles';
import { type } from '../../theme';

export default function PhoneLoginScreen({ route, navigation }: { route: any; navigation: any }) {
  const profile: Profile = route.params?.profile ?? 'patient';
  const withPassword = phoneUsesPassword(profile);
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryCode, setCountryCode] = useState<string | null>('SN');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch((e) => setError(errorMessage(e, t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    const country = countries.find((c) => c.code === countryCode);
    const phone = country ? toInternational(country.dialCode, number) : null;
    if (!phone) {
      setError(t('phone.invalid'));
      return;
    }
    if (withPassword && !password) {
      setError(t('phone.passwordRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (withPassword) {
        const result = await loginWithPassword(phone, password);
        if (isLoginChallenge(result)) navigation.navigate('AdminCode', { challenge: result, identifier: phone, password });
        else await signIn(result);
      } else {
        await requestOtp(phone, lang);
        navigation.navigate('OtpVerify', { phone });
      }
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t(`login.title.${profile}`)}</Text>
      <Text style={type.body}>{withPassword ? t('phone.subtitlePassword') : t('phone.subtitle')}</Text>
      <CountryPicker label={t('phone.country')} countries={countries} value={countryCode} onChange={setCountryCode} />
      <TextField
        label={t('phone.number')}
        value={number}
        onChangeText={setNumber}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        hint={t('phone.hint')}
      />
      {withPassword ? (
        <TextField
          label={t('field.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
      ) : null}
      {error ? <Banner text={error} /> : null}
      <Button title={withPassword ? t('email.login') : t('phone.send')} onPress={submit} loading={loading} />
      <Button
        title={t('welcome.email')}
        variant="secondary"
        onPress={() => navigation.replace('EmailLogin', { profile })}
      />
      {withPassword ? (
        <>
          <Button
            title={t('reset.link')}
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword', { email: '' })}
          />
          <Button
            title={t(`welcome.register.${profile}`)}
            variant="ghost"
            onPress={() => navigation.navigate(registerRoute(profile))}
          />
        </>
      ) : null}
    </Screen>
  );
}
