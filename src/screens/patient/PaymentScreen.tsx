import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { getCountries, getPayment, payAppointment, paymentOperators } from '../../api/endpoints';
import type { Appointment, Country, Payment, PaymentOperator } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Button, Chip, Loading, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { formatDayLong, formatMoney, formatTime } from '../../lib/format';
import { colors, radius, spacing, type } from '../../theme';

const POLL_MS = 3000;
const POLL_MAX = 60; // environ 3 minutes

/** Paiement Mobile Money d'un rendez-vous : opérateur, numéro, puis validation sur le téléphone du patient. */
export default function PaymentScreen({ route, navigation }: { route: any; navigation: any }) {
  const appointment: Appointment = route.params.appointment;
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [operators, setOperators] = useState<PaymentOperator[] | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polls = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([paymentOperators(appointment.practitionerCountryCode), getCountries()])
      .then(([ops, countries]) => {
        setOperators(ops);
        if (ops.length === 1) setOperator(ops[0].code);
        setCountry(countries.find((c) => c.code === appointment.practitionerCountryCode) ?? null);
      })
      .catch((e) => setError(errorMessage(e, t)));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [appointment.practitionerCountryCode, t]);

  const done = useCallback(() => {
    Alert.alert(t('pay.successTitle'), t('pay.successText'), [
      {
        text: t('common.ok'),
        onPress: () => {
          navigation.popToTop();
          navigation.navigate('PatientTabs', { screen: 'Consultations' });
        },
      },
    ]);
  }, [navigation, t]);

  // Le patient valide sur son téléphone ; on interroge le serveur jusqu'au résultat.
  const poll = useCallback(
    (id: string) => {
      timer.current = setTimeout(async () => {
        polls.current += 1;
        try {
          const p = await getPayment(id);
          setPayment(p);
          if (p.status === 'SUCCEEDED') return done();
          if (p.status === 'PENDING' && polls.current < POLL_MAX) return poll(id);
        } catch {
          if (polls.current < POLL_MAX) return poll(id);
        }
      }, POLL_MS);
    },
    [done],
  );

  async function submit() {
    if (!operator) return setError(t('pay.chooseOperator'));
    if (phone.replace(/\D/g, '').length < 6) return setError(t('pay.phoneInvalid'));
    setSending(true);
    setError(null);
    try {
      const p = await payAppointment(appointment.id, phone, operator);
      setPayment(p);
      polls.current = 0;
      if (p.status === 'PENDING') poll(p.id);
      else if (p.status === 'SUCCEEDED') done();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setSending(false);
    }
  }

  /** Message clair pour les refus courants (code secret refusé, solde insuffisant…). */
  const failureText = (code: string | null) => {
    const key = `pay.fail.${code}`;
    const text = t(key);
    return text !== key ? text : t('pay.failGeneric');
  };

  if (!operators && !error) return <Loading />;
  const amount =
    appointment.priceMinor != null && appointment.priceCurrency
      ? formatMoney(appointment.priceMinor, appointment.priceCurrency, locale)
      : '';
  const waiting = payment?.status === 'PENDING';
  const failed = payment?.status === 'FAILED';
  const timedOut = waiting && polls.current >= POLL_MAX;

  return (
    <Screen
      footer={
        waiting && !timedOut ? undefined : (
          <Button
            title={failed ? t('pay.retry') : t('pay.pay', { amount })}
            onPress={() => void submit()}
            loading={sending}
            disabled={!operators?.length}
          />
        )
      }
    >
      <Text style={type.title}>{t('pay.title')}</Text>
      <View style={styles.summary}>
        <Text style={styles.amount}>{amount}</Text>
        <Text style={type.body}>{appointment.practitionerName}</Text>
        <Text style={type.small}>
          {formatDayLong(appointment.startsAt, locale)}, {formatTime(appointment.startsAt, locale)}
        </Text>
      </View>

      {waiting ? (
        <View style={styles.waiting}>
          {timedOut ? (
            <Ionicons name="time-outline" size={36} color={colors.orange} />
          ) : (
            <ActivityIndicator size="large" color={colors.green} />
          )}
          <Text style={type.h3}>{timedOut ? t('pay.slowTitle') : t('pay.waitingTitle')}</Text>
          <Text style={[type.body, styles.center]}>{timedOut ? t('pay.slowText') : t('pay.waitingText')}</Text>
        </View>
      ) : (
        <>
          {failed ? <Banner text={failureText(payment?.failureCode ?? null)} /> : null}
          {operators && operators.length === 0 ? <Banner text={t('pay.noOperator')} /> : null}
          {operators && operators.length > 0 ? (
            <View style={styles.block}>
              <Text style={type.label}>{t('pay.operator')}</Text>
              <View style={styles.row}>
                {operators.map((o) => (
                  <Chip key={o.code} label={o.name} selected={operator === o.code} onPress={() => setOperator(o.code)} />
                ))}
              </View>
            </View>
          ) : null}
          <TextField
            label={t('pay.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            hint={country ? t('pay.phoneHint', { dial: country.dialCode }) : undefined}
          />
          <Text style={type.small}>{t('pay.howItWorks')}</Text>
        </>
      )}
      {error ? <Banner text={error} /> : null}
      <Text style={type.small}>{t('pay.policy')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: radius.card, backgroundColor: colors.greenSoft, padding: spacing.lg, gap: spacing.xs },
  amount: { fontSize: 30, fontWeight: '800', color: colors.navy },
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  waiting: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  center: { textAlign: 'center' },
});
