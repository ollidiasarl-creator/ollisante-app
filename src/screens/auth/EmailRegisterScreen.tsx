import React, { useState } from 'react';
import { Text } from 'react-native';
import { startPatientSignup } from '../../api/endpoints';
import { TermsConsent } from '../../components/Terms';
import { Banner, Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail } from '../../lib/format';
import { type } from '../../theme';

export default function EmailRegisterScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('err.NOM_REQUIS'));
      return;
    }
    if (!isEmail(email)) {
      setError(t('email.invalid'));
      return;
    }
    if (password.length < 8) {
      setError(t('password.tooShort'));
      return;
    }
    if (!accepted) {
      setError(t('terms.required'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const signup = {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        locale: lang,
      };
      // Le compte n'est créé qu'après saisie du code reçu par e-mail.
      await startPatientSignup(signup);
      navigation.navigate('EmailVerify', { signup });
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t('email.registerTitle')}</Text>
      <TextField label={t('field.firstName')} required value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoComplete="given-name" />
      <TextField label={t('field.lastName')} required value={lastName} onChangeText={setLastName} autoCapitalize="words" autoComplete="family-name" />
      <TextField label={t('field.email')} required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField
        label={t('field.password')} required
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        hint={t('password.hint')}
      />
      <TermsConsent checked={accepted} onChange={setAccepted} />
      {error ? <Banner text={error} /> : null}
      <Button title={t('otp.createAccount')} onPress={submit} loading={loading} />
    </Screen>
  );
}
