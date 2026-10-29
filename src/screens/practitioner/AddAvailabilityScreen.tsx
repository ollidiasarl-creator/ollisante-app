import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createAvailabilityRule,
  createFacility,
  getCountries,
  listFacilities,
} from '../../api/endpoints';
import type { AppointmentMode, Country, Facility } from '../../api/types';
import { Banner, Button, Chip, CountryPicker, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isTime } from '../../lib/format';
import { spacing, type } from '../../theme';
import { VIDEO_ENABLED } from '../../config';

const SLOT_CHOICES = [15, 20, 30, 45, 60];

export default function AddAvailabilityScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [mode, setMode] = useState<AppointmentMode>(VIDEO_ENABLED ? 'VIDEO' : 'IN_PERSON');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [newFacility, setNewFacility] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityCity, setFacilityCity] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityCountry, setFacilityCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFacilities().then(setFacilities).catch(() => undefined);
    getCountries().then(setCountries).catch(() => undefined);
  }, []);

  function toggleDay(n: number) {
    setWeekdays((current) => (current.includes(n) ? current.filter((d) => d !== n) : [...current, n].sort()));
  }

  async function submit() {
    if (weekdays.length === 0) return setError(t('avail.errDays'));
    if (!isTime(start) || !isTime(end) || end <= start) return setError(t('avail.errTimes'));
    if (mode === 'IN_PERSON' && !newFacility && !facilityId) return setError(t('avail.errFacility'));
    if (mode === 'IN_PERSON' && newFacility && (!facilityName.trim() || !facilityCountry)) {
      return setError(t('avail.errNewFacility'));
    }

    setLoading(true);
    setError(null);
    try {
      let chosenFacility: string | undefined;
      if (mode === 'IN_PERSON') {
        if (newFacility && facilityCountry) {
          const created = await createFacility({
            name: facilityName.trim(),
            countryCode: facilityCountry,
            city: facilityCity.trim() || undefined,
            address: facilityAddress.trim() || undefined,
          });
          chosenFacility = created.id;
        } else if (facilityId) {
          chosenFacility = facilityId;
        }
      }
      for (const weekday of weekdays) {
        await createAvailabilityRule({
          weekday,
          startTime: start.trim(),
          endTime: end.trim(),
          slotMinutes,
          mode,
          facilityId: chosenFacility,
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={type.label}>{t('avail.days')}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Chip key={n} label={t(`weekdayShort.${n}`)} selected={weekdays.includes(n)} onPress={() => toggleDay(n)} />
        ))}
      </View>
      <TextField label={t('avail.start')} value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" maxLength={5} hint={t('avail.timeHint')} />
      <TextField label={t('avail.end')} value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" maxLength={5} />
      <Text style={type.label}>{t('avail.slotLength')}</Text>
      <View style={styles.row}>
        {SLOT_CHOICES.map((m) => (
          <Chip key={m} label={`${m} min`} selected={slotMinutes === m} onPress={() => setSlotMinutes(m)} />
        ))}
      </View>
      {VIDEO_ENABLED ? (
        <>
          <Text style={type.label}>{t('avail.mode')}</Text>
          <View style={styles.row}>
            <Chip label={t('mode.VIDEO')} selected={mode === 'VIDEO'} onPress={() => setMode('VIDEO')} />
            <Chip label={t('mode.IN_PERSON')} selected={mode === 'IN_PERSON'} onPress={() => setMode('IN_PERSON')} />
          </View>
        </>
      ) : null}

      {mode === 'IN_PERSON' ? (
        <>
          <Text style={type.label}>{t('avail.facility')}</Text>
          <View style={styles.row}>
            {facilities.map((f) => (
              <Chip
                key={f.id}
                label={f.city ? `${f.name} (${f.city})` : f.name}
                selected={!newFacility && facilityId === f.id}
                onPress={() => {
                  setNewFacility(false);
                  setFacilityId(f.id);
                }}
              />
            ))}
            <Chip label={t('avail.newFacility')} selected={newFacility} onPress={() => setNewFacility(true)} />
          </View>
          {newFacility ? (
            <>
              <TextField label={t('avail.facilityName')} value={facilityName} onChangeText={setFacilityName} />
              <CountryPicker label={t('pro.country')} countries={countries} value={facilityCountry} onChange={setFacilityCountry} />
              <TextField label={t('avail.facilityCity')} value={facilityCity} onChangeText={setFacilityCity} />
              <TextField label={t('avail.facilityAddress')} value={facilityAddress} onChangeText={setFacilityAddress} />
            </>
          ) : null}
        </>
      ) : null}

      {error ? <Banner text={error} /> : null}
      <Button title={t('avail.save')} onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
