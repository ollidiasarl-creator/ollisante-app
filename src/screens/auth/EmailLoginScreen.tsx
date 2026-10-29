import React, { useState } from 'react';
import { Text } from 'react-native';
import { isLoginChallenge, loginWithPassword } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail } from '../../lib/format';
import { type Profile, registerRoute } from '../../lib/profiles';
import { type } from '../../theme';

export default function EmailLoginScreen({ route, navigation }: { route: any; navigation: any }) {
  const profile: Profile = route.params?.profile ?? 'patient';
  // Ouvert depuis « Se connecter » (sans profil) ou depuis un créneau choisi avant d'être connecté.
  const generic = !route.params?.profile;
  const toBook = !!route.params?.toBook;
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isEmail(email) || !password) {
      setError(t('email.invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const identifier = email.trim().toLowerCase();
      const result = await loginWithPassword(identifier, password);
      if (isLoginChallenge(result)) navigation.navigate('AdminCode', { challenge: result, identifier, password });
      else await signIn(result);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t(generic ? 'login.title.any' : `login.title.${profile}`)}</Text>
      {toBook ? <Banner kind="info" text={t('login.toBook')} /> : null}
      <Text style={type.body}>{t('email.loginSubtitle')}</Text>
      <TextField
        label={t('field.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label={t('field.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
      />
      <Button
        title={t('reset.link')}
        variant="ghost"
        onPress={() => navigation.navigate('ForgotPassword', { email: email.trim().toLowerCase() })}
      />
      {error ? <Banner text={error} /> : null}
      <Button title={t('email.login')} onPress={submit} loading={loading} />
      <Button
        title={t('welcome.phone')}
        variant="secondary"
        onPress={() => navigation.replace('PhoneLogin', { profile })}
      />
      <Button
        title={t(`welcome.register.${profile}`)}
        variant="ghost"
        onPress={() => navigation.navigate(registerRoute(profile))}
      />
    </Screen>
  );
}
