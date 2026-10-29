import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { emailReceipt, getBilling } from '../../api/endpoints';
import type { Billing, BillingItem } from '../../api/types';
import { AccountRow, AccountSection } from '../../components/AccountList';
import { Banner, Button, EmptyState, Loading, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { formatDayLong, formatMoney } from '../../lib/format';
import { colors, radius, spacing, type } from '../../theme';

const OPERATORS: Record<string, string> = {
  ORANGE_SEN: 'Orange Money', FREE_SEN: 'Free Money', ORANGE_CIV: 'Orange Money', MTN_MOMO_CIV: 'MTN MoMo',
  MOOV_BEN: 'Moov Money', MTN_MOMO_BEN: 'MTN MoMo', AIRTEL_COD: 'Airtel Money', ORANGE_COD: 'Orange Money',
  VODACOM_MPESA_COD: 'M-Pesa', MTN_MOMO_CMR: 'MTN MoMo', ORANGE_CMR: 'Orange Money',
};
const operatorName = (code: string | null) => (code ? OPERATORS[code] ?? code.replace(/_/g, ' ') : 'Mobile Money');

/**
 * Compte → Paiements et reçus. Patient : moyens de paiement de son pays, historique et reçus (jamais la
 * commission). Médecin et structure : encaissements du mois, commission OLIDIA, net et reversements.
 */
export default function BillingScreen() {
  const { t, locale } = useI18n();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getBilling()
        .then(setBilling)
        .catch((e) => setError(errorMessage(e, t)));
    }, [t]),
  );

  const money = (minor: number, currency: string) => formatMoney(minor, currency, locale);

  async function send(paymentId: string) {
    try {
      await emailReceipt(paymentId);
      setSent(paymentId);
      Alert.alert(t('billing.sentTitle'), t('billing.sentText'));
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    }
  }

  if (error) return <Screen><Banner text={error} /></Screen>;
  if (!billing) return <Loading />;

  if (billing.patient) {
    const b = billing.patient;
    return (
      <Screen>
        <AccountSection title={t('billing.methods')}>
          {b.countryCode ? (
            <>
              {b.methods.includes('MOBILE_MONEY') ? <AccountRow icon="phone-portrait-outline" label={t('billing.mobileMoney')} value={t('billing.mobileMoneyHint')} /> : null}
              {b.methods.includes('ON_SITE') ? <AccountRow icon="cash-outline" label={t('booking.payOnSite')} value={t('booking.payOnSiteText')} /> : null}
              {b.methods.length === 0 ? <AccountRow icon="close-circle-outline" label={t('booking.payNone')} /> : null}
            </>
          ) : (
            <AccountRow icon="flag-outline" label={t('billing.setCountry')} />
          )}
          {b.lastMobileMoney ? (
            <AccountRow
              icon="card-outline"
              label={t('billing.lastAccount')}
              value={`${operatorName(b.lastMobileMoney.operator)}${b.lastMobileMoney.phone ? ` · ${b.lastMobileMoney.phone}` : ''}`}
            />
          ) : null}
          <AccountRow icon="lock-closed-outline" label={t('billing.noSecret')} last />
        </AccountSection>

        <Text style={type.h2}>{t('billing.history')}</Text>
        {b.items.length === 0 ? <EmptyState title={t('billing.empty')} /> : null}
        {b.items.map((i) => (
          <PatientRow key={(i.paymentId ?? '') + i.appointmentId} item={i} money={money} sent={sent === i.paymentId} onSend={send} />
        ))}
      </Screen>
    );
  }

  const p = billing.pro;
  if (!p) return <Screen><EmptyState title={t('billing.empty')} /></Screen>;
  return (
    <Screen>
      <View style={styles.note}>
        <Text style={type.small}>{t('billing.commissionNote', { percent: p.commissionPercent })}</Text>
      </View>
      <Text style={type.h2}>{t('billing.thisMonth')}</Text>
      {p.monthTotals.length === 0 ? <Text style={type.small}>{t('billing.noOnline')}</Text> : null}
      {p.monthTotals.map((m) => (
        <View key={m.currency} style={styles.totals}>
          <Total label={t('billing.gross', { count: m.onlineCount })} value={money(m.grossMinor, m.currency)} />
          <Total label={t('billing.commission', { percent: p.commissionPercent })} value={`− ${money(m.commissionMinor, m.currency)}`} />
          <Total label={t('billing.net')} value={money(m.netMinor, m.currency)} strong />
        </View>
      ))}
      {billing.role === 'PRACTITIONER' ? <Text style={type.small}>{t('billing.onSiteCount', { count: p.onSiteThisMonth })}</Text> : null}

      {billing.role === 'PRACTITIONER' ? (
        <>
          <Text style={type.h2}>{t('billing.payouts')}</Text>
          <Text style={type.small}>{t('account.payoutsHint')}</Text>
          {p.payouts.length === 0 ? <Text style={type.small}>{t('billing.noPayout')}</Text> : null}
          {p.payouts.length ? (
            <AccountSection>
              {p.payouts.map((o, idx) => (
                <AccountRow
                  key={o.id}
                  icon={o.status === 'PAID' ? 'checkmark-circle-outline' : 'time-outline'}
                  label={`${money(o.amountMinor, o.currency)} · ${o.status === 'PAID' ? t('billing.paid') : t('billing.due')}`}
                  value={t('billing.payoutLine', {
                    date: formatDayLong(o.periodEnd, locale),
                    gross: money(o.grossMinor, o.currency),
                    commission: money(o.commissionMinor, o.currency),
                  })}
                  last={idx === p.payouts.length - 1}
                />
              ))}
            </AccountSection>
          ) : null}
        </>
      ) : null}

      <Text style={type.h2}>{t('billing.latest')}</Text>
      {p.payments.length === 0 ? <Text style={type.small}>{t('billing.noOnline')}</Text> : null}
      {p.payments.length ? (
        <AccountSection>
          {p.payments.map((pay, idx) => (
            <AccountRow
              key={pay.id}
              icon={pay.status === 'REFUNDED' ? 'return-down-back-outline' : 'phone-portrait-outline'}
              label={`${pay.patient} · ${money(pay.amountMinor, pay.currency)}`}
              value={[
                formatDayLong(pay.appointmentAt, locale),
                billing.role === 'STRUCTURE' ? pay.practitioner : null,
                pay.refundedMinor > 0 ? t('billing.refunded', { amount: money(pay.refundedMinor, pay.currency) }) : null,
                t('billing.netLine', { amount: money(pay.netMinor, pay.currency) }),
              ].filter(Boolean).join(' · ')}
              last={idx === p.payments.length - 1}
            />
          ))}
        </AccountSection>
      ) : null}
    </Screen>
  );
}

function PatientRow({ item, money, sent, onSend }: {
  item: BillingItem;
  money: (minor: number, currency: string) => string;
  sent: boolean;
  onSend: (paymentId: string) => void;
}) {
  const { t, locale } = useI18n();
  const status: Record<BillingItem['status'], string> = {
    PAID: t('billing.status.PAID'),
    PARTIALLY_REFUNDED: t('billing.status.PARTIALLY_REFUNDED'),
    REFUNDED: t('billing.status.REFUNDED'),
    PENDING: t('billing.status.PENDING'),
    ON_SITE: t('billing.status.ON_SITE'),
  };
  const wait = item.status === 'PENDING' || item.status === 'PARTIALLY_REFUNDED';
  return (
    <View style={styles.item}>
      <View style={styles.itemHead}>
        <View style={styles.flex}>
          <Text style={type.h3}>{item.practitioner}</Text>
          <Text style={type.small}>{formatDayLong(item.appointmentAt, locale)}{item.facility ? ` · ${item.facility}` : ''}</Text>
        </View>
        <Text style={styles.amount}>{money(item.amountMinor, item.currency)}</Text>
      </View>
      <Text style={type.small}>
        {item.method === 'MOBILE_MONEY' ? operatorName(item.operator) : t('booking.payOnSite')}
        {item.receiptNumber ? ` · ${t('billing.receipt')} ${item.receiptNumber}` : ''}
      </Text>
      <View style={styles.itemFoot}>
        <View style={[styles.badge, wait && styles.badgeWait, item.status === 'ON_SITE' && styles.badgeMuted]}>
          <Text style={[styles.badgeText, wait && { color: colors.orange }, item.status === 'ON_SITE' && { color: colors.muted }]}>
            {status[item.status] ?? item.status}
          </Text>
        </View>
        {item.refundedMinor > 0 ? <Text style={type.small}>{t('billing.refunded', { amount: money(item.refundedMinor, item.currency) })}</Text> : null}
      </View>
      {item.receiptNumber && item.paymentId ? (
        <Button
          title={sent ? t('billing.sent') : t('billing.emailReceipt')}
          variant="secondary"
          disabled={sent}
          onPress={() => onSend(item.paymentId!)}
        />
      ) : null}
    </View>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[type.body, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[type.body, strong && { fontWeight: '800', color: colors.green }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  note: { padding: spacing.md, borderRadius: radius.input, backgroundColor: colors.greenSoft },
  totals: { padding: spacing.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  item: { padding: spacing.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  itemHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  itemFoot: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  amount: { fontSize: 18, fontWeight: '800', color: colors.navy },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
  badgeWait: { backgroundColor: colors.orangeSoft },
  badgeMuted: { backgroundColor: '#F1F4F2' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.green },
});
