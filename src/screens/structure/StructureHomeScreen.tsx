import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { structureAppointments, structureMembers, structureProfile } from '../../api/endpoints';
import type { Appointment, StructureMember, StructureProfile } from '../../api/types';
import { Banner, Button, Loading } from '../../components/ui';
import { STRUCTURE_WEB_URL } from '../../config';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing, type } from '../../theme';

/** Accueil de la structure : état de la validation et chiffres du jour. */
export default function StructureHomeScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<StructureProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [members, setMembers] = useState<StructureMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, a, m] = await Promise.all([structureProfile(), structureAppointments(), structureMembers()]);
      setProfile(p);
      setAppointments(a);
      setMembers(m);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!profile && !error) return <Loading />;

  const now = new Date();
  const today = now.toDateString();
  const active = (a: Appointment) => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT';
  const stats = [
    { label: t('structure.stat.today'), value: appointments.filter((a) => active(a) && new Date(a.startsAt).toDateString() === today).length },
    { label: t('structure.stat.upcoming'), value: appointments.filter((a) => active(a) && new Date(a.startsAt) > now).length },
    { label: t('structure.stat.doctors'), value: members.filter((m) => m.status === 'ACTIVE').length },
    { label: t('structure.stat.invited'), value: members.filter((m) => m.status === 'INVITED').length },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      {profile ? (
        <View style={styles.block}>
          <Text style={type.title}>{profile.name}</Text>
          <Text style={type.small}>
            {[t(`org.${profile.type}`), profile.city].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
      {profile && profile.verificationStatus !== 'VERIFIED' ? (
        <Banner
          kind={profile.verificationStatus === 'REJECTED' ? 'error' : 'info'}
          text={t(`structure.status.${profile.verificationStatus}`)}
        />
      ) : null}
      {error ? <Banner text={error} /> : null}
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.tile}>
            <Text style={styles.value}>{s.value}</Text>
            <Text style={type.small}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Button title={t('structure.news')} variant="secondary" onPress={() => navigation.navigate('News')} />
      <View style={styles.block}>
        <Text style={type.small}>{t('structure.webText')}</Text>
        <Button title={t('structure.openWeb')} variant="ghost" onPress={() => void Linking.openURL(STRUCTURE_WEB_URL)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.lg },
  block: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.greenSoft,
    gap: spacing.xs,
  },
  value: { fontSize: 28, fontWeight: '800', color: colors.navy },
});
