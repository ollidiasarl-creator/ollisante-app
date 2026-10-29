import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getCountries, registerStructure } from '../../api/endpoints';
import { ORG_TYPES, type Country, type OrganizationType } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { TermsConsent } from '../../components/Terms';
import { Banner, Button, CountryPicker, Screen, SelectPicker, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail, toInternational } from '../../lib/format';
import { type } from '../../theme';

/** Inscription d'une structure (personne morale) : le compte reste en attente jusqu'à la validation OLIDIA. */
export default function StructureRegisterScreen() {
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [orgType, setOrgType] = useState<OrganizationType | null>(null);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [beds, setBeds] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
  }, []);

  async function submit() {
    const country = countries.find((c) => c.code === countryCode);
    const phoneE164 = country ? toInternational(country.dialCode, phone) : null;
    const bedCount = beds.trim() ? Number(beds.replace(/\D/g, '')) : undefined;
    if (!orgType) return setError(t('structure.typeRequired'));
    if (!name.trim()) return setError(t('structure.nameRequired'));
    if (!country) return setError(t('pro.countryRequired'));
    if (!registrationNumber.trim()) return setError(t('structure.registrationRequired'));
    if (!isEmail(email)) return setError(t('email.invalid'));
    if (!phoneE164) return setError(t('phone.invalid'));
    if (!contactName.trim()) return setError(t('structure.contactRequired'));
    if (password.length < 8) return setError(t('password.tooShort'));
    if (!accepted) return setError(t('terms.required'));

    setLoading(true);
    setError(null);
    try {
      const response = await registerStructure({
        type: orgType,
        name: name.trim(),
        countryCode: country.code,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phoneE164,
        domain: domain.trim().toLowerCase() || undefined,
        registrationNumber: registrationNumber.trim(),
        contactName: contactName.trim(),
        contactRole: contactRole.trim() || undefined,
        beds: bedCount,
        password,
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
      <Text style={type.title}>{t('structure.registerTitle')}</Text>
      <Banner kind="info" text={t('structure.verification')} />
      <SelectPicker
        label={t('structure.type')}
        required
        options={ORG_TYPES.map((o) => ({ value: o, label: t(`org.${o}`) }))}
        value={orgType}
        onChange={(v) => setOrgType(v as OrganizationType | null)}
      />
      <TextField label={t('structure.name')} required value={name} onChangeText={setName} autoCapitalize="words" />
      <CountryPicker label={t('phone.country')} required countries={countries} value={countryCode} onChange={setCountryCode} />
      <TextField label={t('structure.city')} value={city} onChangeText={setCity} autoCapitalize="words" />
      <TextField label={t('structure.address')} value={address} onChangeText={setAddress} />
      <TextField
        label={t('structure.registration')} required
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        autoCapitalize="characters"
        hint={t('structure.registrationHint')}
      />
      <TextField
        label={t('structure.email')} required
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextField label={t('phone.number')} required value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint={t('phone.hint')} />
      <TextField
        label={t('structure.domain')}
        value={domain}
        onChangeText={setDomain}
        autoCapitalize="none"
        keyboardType="url"
        hint={t('structure.domainHint')}
      />
      <TextField label={t('structure.contactName')} required value={contactName} onChangeText={setContactName} autoCapitalize="words" />
      <TextField label={t('structure.contactRole')} value={contactRole} onChangeText={setContactRole} />
      <TextField label={t('structure.beds')} value={beds} onChangeText={setBeds} keyboardType="number-pad" />
      <TextField
        label={t('field.password')} required
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        hint={t('password.hint')}
      />
      <TermsConsent checked={accepted} onChange={setAccepted} />
      {error ? <Banner text={error} /> : null}
      <Button title={t('structure.submit')} onPress={submit} loading={loading} />
    </Screen>
  );
}
