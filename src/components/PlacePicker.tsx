import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPlaces } from '../api/endpoints';
import type { Place } from '../api/types';
import { useI18n } from '../i18n';
import { colors, radius, spacing, type } from '../theme';

const cache = new Map<string, Place[]>();

/** Villes (et leurs localités) d'un pays ; liste vide tant qu'aucun pays n'est choisi. */
export function usePlaces(country: string | null | undefined) {
  // Réponse rangée avec son pays : changer de pays n'affiche jamais les villes de l'ancien.
  const [loaded, setLoaded] = useState<{ country: string; list: Place[] } | null>(null);
  useEffect(() => {
    if (!country || cache.has(country)) return;
    let live = true;
    getPlaces(country)
      .then((list) => {
        cache.set(country, list);
        if (live) setLoaded({ country, list });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [country]);
  if (!country) return [];
  return cache.get(country) ?? (loaded?.country === country ? loaded.list : []);
}

/**
 * Ville puis localité (quartier, commune), en listes déroulantes dans la page ou la fenêtre (pas de seconde fenêtre,
 * qui ne s'ouvrirait pas par-dessus une autre sur iPhone). Changer de ville efface la localité ; facultatives toutes deux.
 */
export function PlacePicker({ country, city, locality, onChange }: {
  country: string | null | undefined;
  city: string | null;
  locality: string | null;
  onChange: (city: string | null, locality: string | null) => void;
}) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const places = usePlaces(country);
  // Liste ouverte, pour ce pays seulement (un autre pays la referme).
  const [opened, setOpened] = useState<{ country: string | null | undefined; which: 'city' | 'locality' } | null>(null);
  const open = opened && opened.country === country ? opened.which : null;
  const setOpen = (f: (o: 'city' | 'locality' | null) => 'city' | 'locality' | null) => {
    const which = f(open);
    setOpened(which ? { country, which } : null);
  };
  if (!country || places.length === 0) return null;
  const current = places.find((p) => p.city === city);
  const localities = current?.localities ?? [];

  const select = (
    which: 'city' | 'locality',
    label: string,
    value: string | null,
    empty: string,
    options: string[],
    pick: (v: string | null) => void,
    disabled = false,
  ) => (
    <View style={styles.block}>
      <Text style={type.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open === which }}
        disabled={disabled}
        onPress={() => setOpen((o) => (o === which ? null : which))}
        style={[styles.select, open === which && styles.selectOpen, disabled && styles.disabled]}
      >
        <Text style={[type.body, styles.flex, !value && { color: colors.muted }]} numberOfLines={1}>
          {value ?? empty}
        </Text>
        <Ionicons name={open === which ? 'chevron-up' : 'chevron-down'} size={18} color={colors.navy} />
      </Pressable>
      {open === which ? (
        <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {[null, ...options].map((o) => (
            <Pressable
              key={o ?? '*'}
              accessibilityRole="button"
              onPress={() => {
                setOpen(() => null);
                pick(o);
              }}
              style={[styles.option, o === value && styles.optionOn]}
            >
              <Text style={[type.body, !o && { color: colors.muted }]}>{o ?? empty}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {select('city', fr ? 'Ville' : 'City', current ? city : null, fr ? 'Toutes les villes' : 'All cities',
        places.map((p) => p.city), (c) => onChange(c, null))}
      {select('locality', fr ? 'Localité' : 'Area', locality,
        !current ? (fr ? 'Choisissez d’abord la ville' : 'Choose a city first') : fr ? 'Toutes les localités' : 'All areas',
        localities, (l) => onChange(city, l), !current || localities.length === 0)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.xs },
  flex: { flex: 1 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selectOpen: { borderColor: colors.green },
  disabled: { opacity: 0.55 },
  dropdown: { maxHeight: 220, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  option: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionOn: { backgroundColor: colors.greenSoft },
});
