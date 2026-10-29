import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { cancelAppointment, cancellationPreview, myAppointments, structureAppointments } from '../../api/endpoints';
import type { Appointment, AppointmentStatus } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Card, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { formatDayLong, formatMoney, formatTime } from '../../lib/format';
import { colors, spacing, type } from '../../theme';
import { VIDEO_ENABLED } from '../../config';

const ACCENT: Record<AppointmentStatus, string> = {
  CONFIRMED: colors.green,
  PENDING_PAYMENT: colors.orange,
  COMPLETED: colors.navy,
  CANCELLED: colors.border,
  NO_SHOW: colors.border,
};

export default function AppointmentsScreen({ navigation }: { navigation: any }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        setItems(await (role === 'STRUCTURE' ? structureAppointments() : myAppointments()));
      } catch (e) {
        setError(errorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, role],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  async function confirmCancel(a: Appointment) {
    // Annonce le remboursement prévu par les règles (délai, auteur de l'annulation) avant de confirmer.
    let text = t('appt.cancelText');
    try {
      const p = await cancellationPreview(a.id);
      if (p.paid && p.currency) {
        text =
          p.refundMinor > 0
            ? t('appt.cancelRefund', { amount: formatMoney(p.refundMinor, p.currency, locale), percent: p.refundPercent })
            : t('appt.cancelNoRefund');
      }
    } catch {
      // aperçu indisponible : on garde le message général
    }
    Alert.alert(t('appt.cancelTitle'), text, [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('appt.cancelYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(a.id);
            await load(false);
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  const now = Date.now();
  const isUpcoming = (a: Appointment) =>
    new Date(a.startsAt).getTime() > now && (a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT');
  const isStructure = user?.role === 'STRUCTURE';
  // La structure voit les rendez-vous comme un professionnel, pour tous ses médecins.
  const isPractitioner = user?.role === 'PRACTITIONER' || isStructure;
  const upcoming = items.filter(isUpcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const cancelled = items.filter((a) => !isUpcoming(a) && (a.status === 'CANCELLED' || a.status === 'NO_SHOW'));
  const past = items.filter((a) => !isUpcoming(a) && !cancelled.includes(a));
  const sections = [
    { title: t(isPractitioner ? 'appt.planned' : 'appt.upcoming'), data: upcoming },
    { title: t(isPractitioner ? 'appt.seenPatients' : 'appt.past'), data: past },
    { title: t('appt.cancelled'), data: cancelled },
  ].filter((s) => s.data.length > 0);

  const header = (
    <View style={styles.header}>
      {isStructure ? (
        <Text style={type.small}>{t('appt.structureIntro')}</Text>
      ) : isPractitioner ? (
        <Button title={t('appt.myAvailability')} variant="secondary" onPress={() => navigation.navigate('Availability')} />
      ) : (
        <Button title={t('appt.book')} onPress={() => navigation.navigate('BookFacility')} />
      )}
      {error ? <Banner text={error} /> : null}
    </View>
  );

  if (loading) return <Loading />;

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(a) => a.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState title={t('appt.emptyTitle')} text={t(isPractitioner ? 'appt.emptyTextPro' : 'appt.emptyText')} />
      }
      renderSectionHeader={({ section }) => <Text style={[type.h2, styles.sectionTitle]}>{section.title}</Text>}
      renderItem={({ item }) => {
        const counterpart = isStructure
          ? `${item.patientName} · ${t('book.doctor')} ${item.practitionerName}`
          : isPractitioner
            ? item.patientName
            : item.practitionerName;
        return (
          <View style={styles.item}>
            <Card accent={ACCENT[item.status]}>
              <Text style={type.h3}>
                {formatDayLong(item.startsAt, locale)}, {formatTime(item.startsAt, locale)}
              </Text>
              <Text style={type.body}>{counterpart}</Text>
              {item.facilityName ? <Text style={type.small}>{item.facilityName}</Text> : null}
              <Text style={type.small}>
                {t(`mode.${item.mode}`)} - {t(`status.${item.status}`)}
              </Text>
              {item.priceMinor != null && item.priceCurrency && item.status !== 'CANCELLED' ? (
                <Text style={type.small}>
                  {t(item.paymentMode === 'ONLINE' && item.status !== 'PENDING_PAYMENT' ? 'appt.paid' : 'appt.onSite', {
                    amount: formatMoney(item.priceMinor, item.priceCurrency, locale),
                  })}
                </Text>
              ) : null}
              {item.status === 'PENDING_PAYMENT' ? (
                isPractitioner ? (
                  <Text style={styles.pending}>{t('appt.awaitingPayment')}</Text>
                ) : (
                  <View style={styles.actions}>
                    <Text style={styles.pending}>{t('appt.payWithin')}</Text>
                    <Button title={t('appt.payNow')} onPress={() => navigation.navigate('Payment', { appointment: item })} />
                  </View>
                )
              ) : null}
              {isUpcoming(item) ? (
                <View style={styles.actions}>
                  {VIDEO_ENABLED && item.mode === 'VIDEO' && item.status === 'CONFIRMED' ? (
                    <Button title={t('appt.join')} variant="secondary" disabled onPress={() => undefined} />
                  ) : null}
                  <Button title={t('appt.cancel')} variant="warning" onPress={() => void confirmCancel(item)} />
                  {VIDEO_ENABLED && item.mode === 'VIDEO' && item.status === 'CONFIRMED' ? (
                    <Text style={type.small}>{t('appt.joinSoon')}</Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl },
  header: { gap: spacing.md },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.white },
  item: { marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  pending: { fontSize: 14, fontWeight: '600', color: colors.orange },
});
