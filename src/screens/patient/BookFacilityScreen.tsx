import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { getCountries, getProfile, listFacilities, updateProfile } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { countryStore } from '../../auth/storage';
import type { Country, Facility } from '../../api/types';
import { Banner, Card, CountryPicker, EmptyState, Loading, TextField } from '../../components/ui';
import { PlacePicker } from '../../components/PlacePicker';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { deviceCountry } from '../../lib/media';
import { colors, spacing, type } from '../../theme';
import { VIDEO_ENABLED } from '../../config';

/** Prendre rendez-vous, étape 1 : le pays puis l'hôpital (ou la consultation vidéo). */
export default function BookFacilityScreen({ route, navigation }: { route?: any; navigation: any }) {
  const { t, lang } = useI18n();
  // Sans compte, on parcourt librement : le pays vient de l'écran d'accueil et n'est pas enregistré sur un compte.
  const guest = useAuth().status === 'signedOut';
  const countryName = (c?: Country) => (c ? (lang === 'fr' ? c.nameFr : c.nameEn) : '');
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  // Pays du compte : la prise de rendez-vous est limitée à ce pays (le choix n'est proposé que s'il est inconnu).
  const [locked, setLocked] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  // Ville et localité (facultatives) : venues de la fenêtre de l'accueil, modifiables ici.
  const [city, setCity] = useState<string | null>(route?.params?.city ?? null);
  const [locality, setLocality] = useState<string | null>(route?.params?.locality ?? null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCountries(), guest ? null : getProfile()])
      .then(([list, profile]) => {
        setCountries(list);
        if (guest) {
          const own = route?.params?.countryCode ?? deviceCountry();
          if (own && list.some((c) => c.code === own)) setCountry(own);
          return;
        }
        if (profile?.countryCode) {
          setCountry(profile.countryCode);
          setLocked(true);
          return;
        }
        const own = deviceCountry();
        if (own && list.some((c) => c.code === own)) setCountry(own);
      })
      .catch((e) => setError(errorMessage(e, t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, guest]);

  useEffect(() => {
    if (!country) return;
    let active = true;
    setLoading(true);
    setError(null);
    listFacilities(country, city, locality)
      .then((list) => active && setFacilities(list))
      .catch((e) => active && setError(errorMessage(e, t)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [country, city, locality, t]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => `${f.name} ${f.city ?? ''}`.toLowerCase().includes(q));
  }, [facilities, filter]);

  const header = (
    <View style={styles.header}>
      <Text style={type.title}>{t('book.whereTitle')}</Text>
      {locked ? (
        <Text style={type.small}>
          {t('book.countryLocked', { country: countryName(countries.find((c) => c.code === country)) })}
        </Text>
      ) : (
        <CountryPicker
          label={t('book.country')}
          countries={countries}
          value={country}
          onChange={(code) => {
            if (code !== country) {
              setCity(null);
              setLocality(null);
            }
            setCountry(code);
            setFilter('');
            // Premier choix : il devient le pays du compte (et filtre ensuite tout le reste).
            if (code && guest) void countryStore.save(code);
            else if (code) void updateProfile({ countryCode: code }).then(() => setLocked(true)).catch(() => undefined);
          }}
        />
      )}
      {country ? (
        <>
          <PlacePicker
            country={country}
            city={city}
            locality={locality}
            onChange={(c, l) => {
              setCity(c);
              setLocality(l);
            }}
          />
          {VIDEO_ENABLED ? (
            <Card onPress={() => navigation.navigate('BookSpecialty', { countryCode: country, video: true })}>
              <View style={styles.videoRow}>
                <View style={styles.icon}>
                  <Ionicons name="videocam" size={22} color={colors.green} />
                </View>
                <View style={styles.flex}>
                  <Text style={type.h3}>{t('book.video')}</Text>
                  <Text style={type.small}>{t('book.videoText')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </View>
            </Card>
          ) : null}
          <Text style={[type.h2, styles.sectionTitle]}>{t('book.hospitals')}</Text>
          {facilities.length > 5 ? (
            <TextField
              label={t('book.filter')}
              value={filter}
              onChangeText={setFilter}
              placeholder={t('book.filterHint')}
              autoCorrect={false}
            />
          ) : null}
        </>
      ) : (
        <Banner kind="info" text={t('book.chooseCountry')} />
      )}
      {error ? <Banner text={error} /> : null}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={country ? shown : []}
      keyExtractor={(f) => f.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <Card onPress={() => navigation.navigate('BookSpecialty', { countryCode: country, facility: item })}>
          <View style={styles.videoRow}>
            <View style={styles.icon}>
              <Ionicons name="business" size={22} color={colors.green} />
            </View>
            <View style={styles.flex}>
              <Text style={type.h3}>{item.name}</Text>
              {item.city || item.address || item.locality ? (
                <Text style={type.small}>{[item.address, item.locality, item.city].filter(Boolean).join(', ')}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </Card>
      )}
      ListEmptyComponent={
        country && loading ? (
          <View style={styles.loading}>
            <Loading />
          </View>
        ) : country && !error ? (
          city ? (
          <EmptyState
            title={lang === 'fr' ? 'Aucun établissement à cet endroit' : 'No facility in this area yet'}
            text={lang === 'fr' ? 'Essayez une autre ville ou localité, ou « Toutes les villes ».' : 'Try another city or area, or “All cities”.'}
          />
        ) : (
          <EmptyState title={t('book.noHospitalTitle')} text={t('book.noHospitalText')} />
        )
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md },
  sectionTitle: { marginTop: spacing.md },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  loading: { padding: spacing.xxl },
});
