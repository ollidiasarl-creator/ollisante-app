import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { bookAppointment, getCountries, getRelatives } from '../../api/endpoints';
import type { Country, Facility, PaymentMethod, PractitionerSummary, Relative, Slot } from '../../api/types';
import { Button, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { formatDayLong, formatMoney, formatTime } from '../../lib/format';
import { colors, radius, spacing, type } from '../../theme';

/** Prendre rendez-vous, étape 4 : récapitulatif, motif facultatif, confirmation. */
export default function BookConfirmScreen({ route, navigation }: { route: any; navigation: any }) {
  const { practitioner, slot, facility } = route.params as {
    practitioner: PractitionerSummary;
    slot: Slot;
    facility?: Facility;
  };
  const { t, lang, locale } = useI18n();
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [country, setCountry] = useState<Country | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  // Pour qui : soi-même ou l'un de ses proches (Compte → Mes proches).
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [relativeId, setRelativeId] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      getRelatives().then(setRelatives).catch(() => undefined);
    }, []),
  );

  // Moyens de paiement activés pour le pays dans le centre d'administration : le patient doit en choisir un.
  useEffect(() => {
    getCountries()
      .then((list) => setCountry(list.find((c) => c.code === practitioner.countryCode) ?? null))
      .catch(() => undefined);
  }, [practitioner.countryCode]);

  const fee =
    practitioner.consultationFeeMinor && practitioner.feeCurrency
      ? formatMoney(practitioner.consultationFeeMinor, practitioner.feeCurrency, locale)
      : null;
  const place =
    slot.mode === 'VIDEO'
      ? t('book.video')
      : facility
        ? [facility.name, facility.address, facility.city].filter(Boolean).join(', ')
        : t('mode.IN_PERSON');

  async function confirm() {
    if (fee && !method) {
      Alert.alert(t('booking.payTitle', { fee }), t('booking.payRequired'));
      return;
    }
    setBooking(true);
    try {
      const appointment = await bookAppointment({
        practitionerId: practitioner.id,
        startsAt: slot.startsAt,
        mode: slot.mode,
        reason: reason.trim() || undefined,
        paymentMethod: fee ? (method ?? undefined) : undefined,
        relativeId: relativeId ?? undefined,
      });
      if (appointment.status === 'PENDING_PAYMENT') {
        // Créneau réservé 30 minutes : le paiement Mobile Money confirme le rendez-vous.
        navigation.replace('Payment', { appointment });
        return;
      }
      Alert.alert(
        t('booking.doneTitle'),
        appointment.paymentMode === 'ON_SITE' && fee ? t('booking.doneOnSite', { fee }) : t('booking.doneConfirmed'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              navigation.popToTop();
              navigation.navigate('PatientTabs', { screen: 'Consultations' });
            },
          },
        ],
      );
    } catch (e) {
      const taken = e instanceof ApiError && e.code === 'CRENEAU_INDISPONIBLE';
      Alert.alert(t('common.error'), errorMessage(e, t), [
        { text: t('common.ok'), onPress: taken ? () => navigation.goBack() : undefined },
      ]);
    } finally {
      setBooking(false);
    }
  }

  const rows: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
    { icon: 'calendar', text: `${formatDayLong(slot.startsAt, locale)}, ${formatTime(slot.startsAt, locale)}` },
    { icon: slot.mode === 'VIDEO' ? 'videocam' : 'location', text: place },
    ...(fee ? [{ icon: 'cash' as const, text: t('booking.fee', { fee }) }] : []),
  ];
  const options: { id: PaymentMethod; title: string; text: string }[] = [
    ...(country?.onlinePayment ? [{ id: 'MOBILE_MONEY' as const, title: t('booking.payMobile'), text: t('booking.payMobileText') }] : []),
    ...(country?.onSitePayment !== false ? [{ id: 'ON_SITE' as const, title: t('booking.payOnSite'), text: t('booking.payOnSiteText') }] : []),
  ];

  return (
    <Screen
      footer={
        <Button
          title={method === 'MOBILE_MONEY' ? t('booking.confirmPay') : t('booking.confirm')}
          onPress={confirm}
          loading={booking}
          disabled={!!fee && (!method || options.length === 0)}
        />
      }
    >
      <Text style={type.title}>{t('book.confirmTitle')}</Text>
      <View style={styles.summary}>
        <Text style={type.h3}>
          {t('book.doctor')} {practitioner.firstName} {practitioner.lastName}
        </Text>
        <Text style={type.small}>
          {practitioner.specialties.map((s) => (lang === 'fr' ? s.nameFr : s.nameEn)).join(', ')}
        </Text>
        {rows.map((row) => (
          <View key={row.icon} style={styles.row}>
            <Ionicons name={row.icon} size={20} color={colors.green} />
            <Text style={[type.body, styles.flex]}>{row.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.pay} accessibilityRole="radiogroup">
        <Text style={type.label}>{t('booking.forWhom')}</Text>
        {[{ id: null as string | null, label: t('booking.forMe') }, ...relatives.map((r) => ({ id: r.id as string | null, label: t('booking.forRelative', { name: `${r.firstName} ${r.lastName}` }) }))].map((o) => {
          const selected = o.id === relativeId;
          return (
            <Pressable
              key={o.id ?? 'me'}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setRelativeId(o.id)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.green : colors.muted} />
              <Text style={[type.body, styles.flex]}>{o.label}</Text>
            </Pressable>
          );
        })}
        <Button title={t('booking.addRelative')} variant="ghost" onPress={() => navigation.navigate('RelativeEdit')} />
      </View>
      {fee ? (
        <View style={styles.pay} accessibilityRole="radiogroup">
          <Text style={type.label}>{t('booking.payTitle', { fee })}</Text>
          {options.map((o) => {
            const selected = o.id === method;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setMethod(o.id)}
                style={[styles.option, selected && styles.optionOn]}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.green : colors.muted}
                />
                <View style={styles.flex}>
                  <Text style={type.h3}>{o.title}</Text>
                  <Text style={type.small}>{o.text}</Text>
                </View>
              </Pressable>
            );
          })}
          {country && options.length === 0 ? <Text style={type.small}>{t('booking.payNone')}</Text> : null}
        </View>
      ) : null}
      <TextField
        label={t('booking.reason')}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
        placeholder={t('booking.reasonHint')}
      />
      <Text style={type.small}>{t('booking.timezoneNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: radius.card,
    backgroundColor: colors.greenSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  pay: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionOn: { borderColor: colors.green, backgroundColor: colors.greenSoft },
});
