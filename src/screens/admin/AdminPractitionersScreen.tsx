import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { adminPractitioners, getCountries, setPractitionerVerification } from '../../api/endpoints';
import type { AdminPractitioner, Country, VerificationStatus } from '../../api/types';
import { Banner, Button, Card, Chip, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, spacing, type } from '../../theme';

const TABS: VerificationStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];
const ACCENT: Record<VerificationStatus, string> = {
  PENDING: colors.orange,
  VERIFIED: colors.green,
  REJECTED: colors.border,
};

/** Administration : vérifier le diplôme des praticiens inscrits, puis les rendre visibles (ou non) des patients. */
export default function AdminPractitionersScreen() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<VerificationStatus>('PENDING');
  const [items, setItems] = useState<AdminPractitioner[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
  }, []);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        setItems((await adminPractitioners(tab)).content);
      } catch (e) {
        setError(errorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const countryName = (code: string) => {
    const c = countries.find((x) => x.code === code);
    return c ? (lang === 'fr' ? c.nameFr : c.nameEn) : code;
  };

  function decide(p: AdminPractitioner, status: VerificationStatus) {
    const name = `${p.firstName} ${p.lastName}`;
    Alert.alert(
      t(status === 'VERIFIED' ? 'admin.verifyTitle' : 'admin.rejectTitle', { name }),
      t(status === 'VERIFIED' ? 'admin.verifyText' : 'admin.rejectText'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t(status === 'VERIFIED' ? 'admin.verify' : 'admin.reject'),
          style: status === 'VERIFIED' ? 'default' : 'destructive',
          onPress: async () => {
            setBusy(p.id);
            try {
              await setPractitionerVerification(p.id, status);
              setItems((list) => list.filter((x) => x.id !== p.id));
            } catch (e) {
              Alert.alert(t('common.error'), errorMessage(e, t));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  const header = (
    <View style={styles.header}>
      <Text style={type.body}>{t('admin.intro')}</Text>
      <View style={styles.row}>
        {TABS.map((s) => (
          <Chip
            key={s}
            label={t(`admin.tab.${s}`)}
            selected={tab === s}
            onPress={() => {
              setLoading(true);
              setTab(s);
            }}
          />
        ))}
      </View>
      {error ? <Banner text={error} /> : null}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={loading ? [] : items}
      keyExtractor={(p) => p.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <View style={styles.loading}>
            <Loading />
          </View>
        ) : error ? null : (
          <EmptyState title={t(`admin.empty.${tab}`)} />
        )
      }
      renderItem={({ item: p }) => (
        <Card accent={ACCENT[p.verificationStatus]}>
          <Text style={type.h3}>
            {p.firstName} {p.lastName}
          </Text>
          <Text style={type.small}>{p.specialties.map((s) => (lang === 'fr' ? s.nameFr : s.nameEn)).join(', ')}</Text>
          <Text style={type.body}>
            {t('admin.license')} : {p.licenseNumber}
          </Text>
          <Text style={type.small}>{countryName(p.countryCode)}</Text>
          {p.email ? <Text style={type.small}>{p.email}</Text> : null}
          {p.phone ? <Text style={type.small}>{p.phone}</Text> : null}
          <View style={styles.actions}>
            {p.verificationStatus !== 'VERIFIED' ? (
              <Button title={t('admin.verify')} loading={busy === p.id} onPress={() => decide(p, 'VERIFIED')} />
            ) : null}
            {p.verificationStatus !== 'REJECTED' ? (
              <Button
                title={t('admin.reject')}
                variant="warning"
                disabled={busy === p.id}
                onPress={() => decide(p, 'REJECTED')}
              />
            ) : null}
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  loading: { padding: spacing.xxl },
});
