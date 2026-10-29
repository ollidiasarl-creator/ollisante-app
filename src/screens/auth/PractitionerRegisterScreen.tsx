import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getCountries, getSpecialties, registerPractitioner } from '../../api/endpoints';
import type { Country, Specialty } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { TermsConsent } from '../../components/Terms';
import { Banner, Button, CountryPicker, MultiSelectPicker, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail, toInternational } from '../../lib/format';
import { type } from '../../theme';

export default function PractitionerRegisterScreen() {
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
    getSpecialties().then(setSpecialties).catch(() => undefined);
  }, []);

  async function submit() {
    const country = countries.find((c) => c.code === countryCode);
    const phoneE164 = country ? toInternational(country.dialCode, phone) : null;
    if (!firstName.trim() || !lastName.trim()) return setError(t('err.NOM_REQUIS'));
    if (!isEmail(email)) return setError(t('email.invalid'));
    if (!phoneE164) return setError(t('phone.invalid'));
    if (password.length < 8) return setError(t('password.tooShort'));
    if (!country) return setError(t('pro.countryRequired'));
    if (!licenseNumber.trim()) return setError(t('pro.licenseRequired'));
    if (selected.length === 0) return setError(t('pro.specialtyRequired'));
    if (!accepted) return setError(t('terms.required'));

    setLoading(true);
    setError(null);
    try {
      const response = await registerPractitioner({
        email: email.trim().toLowerCase(),
        phone: phoneE164,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        countryCode: country.code,
        licenseNumber: licenseNumber.trim(),
        specialtyCodes: selected,
        locale: lang,
      });
      await signIn(response);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={type.title}>{t('pro.title')}</Text>
      <Banner kind="info" text={t('pro.verification')} />
      <TextField label={t('field.firstName')} required value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <TextField label={t('field.lastName')} required value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <CountryPicker label={t('pro.country')} required countries={countries} value={countryCode} onChange={setCountryCode} />
      <TextField label={t('field.email')} required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label={t('phone.number')} required value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint={t('phone.hint')} />
      <TextField label={t('field.password')} required value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" hint={t('password.hint')} />
      <TextField label={t('pro.license')} required value={licenseNumber} onChangeText={setLicenseNumber} autoCapitalize="characters" />
      <MultiSelectPicker
        label={t('pro.specialties')} required
        options={specialties.map((s) => ({ value: s.code, label: lang === 'fr' ? s.nameFr : s.nameEn }))}
        values={selected}
        onChange={setSelected}
      />
      <TermsConsent checked={accepted} onChange={setAccepted} />
      {error ? <Banner text={error} /> : null}
      <Button title={t('pro.submit')} onPress={submit} loading={loading} />
    </Screen>
  );
}
