import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getCountries, getProfile, updateProfile } from '../../api/endpoints';
import type { Country, Sex } from '../../api/types';
import { Button, CountryPicker, Loading, Screen, SelectPicker, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';

/** « 1990-05-21 » ↔ « 21/05/1990 » : la date de naissance se saisit au format habituel. */
const toDisplay = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
function toIso(display: string): string | null | undefined {
  const t = display.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return undefined;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Compte patient → Mes informations personnelles (identité et adresse). */
export default function ProfileEditScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birth, setBirth] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [birthError, setBirthError] = useState<string | null>(null);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
    getProfile()
      .then((p) => {
        const info = p.patient;
        setFirstName(info?.firstName ?? '');
        setLastName(info?.lastName ?? '');
        setBirth(toDisplay(info?.birthDate ?? null));
        setSex(info?.sex ?? null);
        setCountry(info?.countryCode ?? null);
        setCity(info?.city ?? '');
        setAddress(info?.address ?? '');
      })
      .catch((e) => Alert.alert(t('common.error'), errorMessage(e, t)))
      .finally(() => setLoaded(true));
  }, [t]);

  async function save() {
    const birthDate = toIso(birth);
    if (birthDate === undefined) {
      setBirthError(t('profile.birthFormat'));
      return;
    }
    setBirthError(null);
    setSaving(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        ...(birthDate ? { birthDate } : {}),
        ...(sex ? { sex } : {}),
        countryCode: country ?? '',
        city,
        address,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <Loading />;
  return (
    <Screen footer={<Button title={t('common.save')} onPress={save} loading={saving} />}>
      <TextField label={t('profile.firstName')} required value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
      <TextField label={t('profile.lastName')} required value={lastName} onChangeText={setLastName} autoComplete="family-name" />
      <TextField
        label={t('profile.birthDate')}
        value={birth}
        onChangeText={setBirth}
        placeholder="JJ/MM/AAAA"
        keyboardType="numbers-and-punctuation"
        error={birthError}
      />
      <SelectPicker
        label={t('profile.sex')}
        options={[
          { value: 'FEMALE', label: t('profile.sex.FEMALE') },
          { value: 'MALE', label: t('profile.sex.MALE') },
          { value: 'OTHER', label: t('profile.sex.OTHER') },
        ]}
        value={sex}
        onChange={(v) => setSex(v as Sex | null)}
      />
      <CountryPicker label={t('profile.country')} countries={countries} value={country} onChange={setCountry} />
      <TextField label={t('profile.city')} value={city} onChangeText={setCity} />
      <TextField label={t('profile.address')} value={address} onChangeText={setAddress} autoComplete="street-address" />
    </Screen>
  );
}
