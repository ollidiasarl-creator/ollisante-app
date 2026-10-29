import React, { useState } from 'react';
import { Alert } from 'react-native';
import { addRelative, updateRelative } from '../../api/endpoints';
import type { Relation, Relative, Sex } from '../../api/types';
import { Button, Screen, SelectPicker, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';

const toDisplay = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');
function toIso(display: string): string | null | undefined {
  const t = display.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
}

/** Ajouter ou modifier un proche (enfant, parent, conjoint…). */
export default function RelativeEditScreen({ route, navigation }: { route: any; navigation: any }) {
  const { t } = useI18n();
  const relative: Relative | undefined = route.params?.relative;
  const [firstName, setFirstName] = useState(relative?.firstName ?? '');
  const [lastName, setLastName] = useState(relative?.lastName ?? '');
  const [relation, setRelation] = useState<Relation>(relative?.relation ?? 'CHILD');
  const [birth, setBirth] = useState(toDisplay(relative?.birthDate));
  const [sex, setSex] = useState<Sex | null>(relative?.sex ?? null);
  const [saving, setSaving] = useState(false);
  const [birthError, setBirthError] = useState<string | null>(null);

  async function save() {
    const birthDate = toIso(birth);
    if (birthDate === undefined) return setBirthError(t('profile.birthFormat'));
    setBirthError(null);
    setSaving(true);
    try {
      const input = { firstName, lastName, relation, birthDate, sex };
      if (relative) await updateRelative(relative.id, input);
      else await addRelative(input);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={<Button title={t('common.save')} onPress={save} loading={saving} disabled={!firstName.trim() || !lastName.trim()} />}>
      <TextField label={t('profile.firstName')} required value={firstName} onChangeText={setFirstName} />
      <TextField label={t('profile.lastName')} required value={lastName} onChangeText={setLastName} />
      <SelectPicker
        label={t('relatives.relationLabel')}
        required
        options={(['CHILD', 'PARENT', 'SPOUSE', 'OTHER'] as Relation[]).map((r) => ({ value: r, label: t(`relatives.relation.${r}`) }))}
        value={relation}
        onChange={(v) => v && setRelation(v as Relation)}
      />
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
    </Screen>
  );
}
