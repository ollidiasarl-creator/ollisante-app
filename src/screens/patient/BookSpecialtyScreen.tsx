import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getFacilitySpecialties, getSpecialties } from '../../api/endpoints';
import type { Facility, Specialty } from '../../api/types';
import { Banner, Button, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing, type } from '../../theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  GENERAL_PRACTICE: 'medkit',
  PEDIATRICS: 'happy',
  GYNECOLOGY: 'female',
  CARDIOLOGY: 'heart',
  DERMATOLOGY: 'hand-left',
  OPHTHALMOLOGY: 'eye',
  DENTISTRY: 'medical',
  PSYCHIATRY: 'chatbubbles',
  RADIOLOGY: 'scan',
  ANESTHESIOLOGY: 'bed',
  ENT: 'ear',
  ORTHOPEDICS: 'body',
  NEUROLOGY: 'pulse',
  UROLOGY: 'water',
  NUTRITION: 'nutrition',
};

/** Prendre rendez-vous, étape 2 : les spécialités proposées par cet hôpital (ou en vidéo). */
export default function BookSpecialtyScreen({ route, navigation }: { route: any; navigation: any }) {
  const { countryCode, facility, video } = route.params as {
    countryCode: string;
    facility?: Facility;
    video?: boolean;
  };
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(facility ? await getFacilitySpecialties(facility.id) : await getSpecialties());
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [facility, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = (s: Specialty) => (lang === 'fr' ? s.nameFr : s.nameEn);

  const header = (
    <View style={styles.header}>
      <Text style={styles.place}>{facility ? facility.name : t('book.video')}</Text>
      <Text style={type.title}>{t('book.specialtyTitle')}</Text>
      {error ? (
        <>
          <Banner text={error} />
          <Button title={t('common.retry')} variant="secondary" onPress={() => void load()} />
        </>
      ) : null}
    </View>
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      numColumns={2}
      columnWrapperStyle={styles.columns}
      keyExtractor={(s) => s.code}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('BookAgenda', { countryCode, facility, video, specialty: item })
          }
          style={({ pressed }) => [styles.tile, items.length % 2 === 1 && styles.tileHalf, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Ionicons name={ICONS[item.code] ?? 'medical'} size={24} color={colors.green} />
          </View>
          <Text style={styles.tileText} numberOfLines={2}>
            {name(item)}
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={
        error ? null : <EmptyState title={t('book.noSpecialtyTitle')} text={t('book.noSpecialtyText')} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  place: { fontSize: 15, fontWeight: '600', color: colors.green },
  columns: { gap: spacing.md },
  tile: {
    flex: 1,
    minHeight: 112,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  tileHalf: { maxWidth: '48%' },
  pressed: { backgroundColor: colors.greenSoft },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.navy },
});
