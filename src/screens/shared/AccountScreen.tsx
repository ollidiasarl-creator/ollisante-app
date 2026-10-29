import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { deleteAccount, getCountries, getProfile, updateProfile } from '../../api/endpoints';
import type { Country, Profile } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { AccountHeader, AccountRow, AccountSection } from '../../components/AccountList';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { Button, Screen } from '../../components/ui';
import { STRUCTURE_WEB_URL } from '../../config';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing, type } from '../../theme';

/**
 * Compte, identique pour les trois profils (sur le modèle de Doctolib et Qare) : Mes rendez-vous, Mes informations
 * (profil, proches), Connexion, Paiement et facturation, Paramètres, Double authentification, Confidentialité,
 * Déconnexion.
 */
export default function AccountScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile).catch(() => undefined);
    }, []),
  );
  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
  }, []);

  const role = user?.role ?? 'PATIENT';
  const p = profile;
  const name = p?.patient
    ? [p.patient.firstName, p.patient.lastName].filter(Boolean).join(' ')
    : p?.practitioner
      ? `Dr ${p.practitioner.firstName} ${p.practitioner.lastName}`
      : p?.structure?.name ?? '';
  const contact = user?.email ?? user?.phone ?? '';
  const verified = p?.practitioner?.verificationStatus ?? p?.structure?.verificationStatus;
  const badge =
    role === 'PATIENT'
      ? t('role.PATIENT')
      : verified === 'VERIFIED'
        ? t(role === 'STRUCTURE' ? 'account.structureVerified' : 'account.verified')
        : t('account.pending');
  const country = countries.find((c) => c.code === p?.countryCode);
  const countryName = country ? (lang === 'fr' ? country.nameFr : country.nameEn) : t('account.countryUnset');

  function openProfile() {
    if (role === 'PATIENT') navigation.navigate('ProfileEdit');
    else if (role === 'PRACTITIONER') navigation.navigate('PractitionerProfile');
    else void Linking.openURL(STRUCTURE_WEB_URL);
  }

  async function toggleTwoStep(value: boolean) {
    try {
      setProfile(await updateProfile({ twoStepEnabled: value }));
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    }
  }

  function confirmSignOut() {
    Alert.alert(t('account.logoutTitle'), t('account.logoutText'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('account.logout'), onPress: () => void signOut() },
    ]);
  }

  function confirmDeletion() {
    if (role === 'STRUCTURE') {
      Alert.alert(t('account.delete'), t('structure.deleteInfo'));
      return;
    }
    Alert.alert(t('account.deleteTitle'), t('account.deleteText'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('account.deleteYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            await signOut();
            Alert.alert(t('account.deletedTitle'), t('account.deletedText'));
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <AccountHeader
        name={name || contact}
        subtitle={name ? contact : null}
        badge={badge}
        badgeTone={role === 'PATIENT' || verified === 'VERIFIED' ? 'ok' : 'wait'}
      />

      <AccountSection>
        <AccountRow icon="calendar-outline" label={t('account.appointments')} onPress={() => navigation.navigate('Consultations')} last />
      </AccountSection>

      <AccountSection title={t('account.sectionInfo')}>
        <AccountRow
          icon={role === 'STRUCTURE' ? 'business-outline' : role === 'PRACTITIONER' ? 'medkit-outline' : 'person-outline'}
          label={t('account.myProfile')}
          value={role === 'STRUCTURE' ? p?.structure?.name ?? null : t('account.personalHint')}
          onPress={openProfile}
        />
        {role === 'PRACTITIONER' ? (
          <>
            <AccountRow icon="time-outline" label={t('tab.availability')} onPress={() => navigation.navigate('Availability')} />
            <AccountRow icon="business-outline" label={t('account.structures')} onPress={() => navigation.navigate('MyStructures')} />
          </>
        ) : null}
        {role === 'STRUCTURE' ? <AccountRow icon="people-outline" label={t('tab.doctors')} onPress={() => navigation.navigate('Doctors')} /> : null}
        <AccountRow
          icon="people-circle-outline"
          label={t('account.relatives')}
          value={t('account.relativesHint')}
          onPress={() => navigation.navigate('Relatives')}
          last
        />
      </AccountSection>

      <AccountSection title={t('account.sectionLogin')}>
        <AccountRow icon="call-outline" label={t('account.phone')} value={user?.phone ?? t('account.notSet')} />
        <AccountRow icon="mail-outline" label={t('account.email')} value={user?.email ?? t('account.notSet')} />
        {p?.hasPassword ? (
          <AccountRow icon="lock-closed-outline" label={t('account.password')} onPress={() => navigation.navigate('ChangePassword')} last />
        ) : (
          <AccountRow icon="shield-checkmark-outline" label={t('account.password')} value={t('account.smsLoginHint')} last />
        )}
      </AccountSection>

      <AccountSection title={t('account.sectionBilling')}>
        <AccountRow
          icon="wallet-outline"
          label={t('account.paymentMethods')}
          value={role === 'PATIENT' ? t('account.billingHint') : t('account.payoutsHint')}
          onPress={() => navigation.navigate('Billing')}
        />
        <AccountRow
          icon="card-outline"
          label={t('account.cards')}
          value={t('account.cardsHint')}
          right={<View style={styles.soon}><Text style={styles.soonText}>{t('account.soon')}</Text></View>}
          last
        />
      </AccountSection>

      <AccountSection title={t('account.sectionSettings')}>
        <AccountRow
          icon="flag-outline"
          label={t('account.country')}
          value={countryName}
          onPress={role === 'PATIENT' ? () => navigation.navigate('ProfileEdit') : undefined}
        />
        <AccountRow icon="language-outline" label={t('account.language')} right={<LanguageSwitch compact />} last />
      </AccountSection>

      <AccountSection>
        <AccountRow
          icon="key-outline"
          label={t('account.twoStep')}
          value={p?.twoStepEnabled ? t('account.twoStepOn') : t('account.twoStepHint')}
          right={
            <Switch
              value={!!p?.twoStepEnabled}
              onValueChange={(v) => void toggleTwoStep(v)}
              disabled={!p || !user?.email}
              trackColor={{ true: colors.green }}
            />
          }
          last
        />
      </AccountSection>

      <AccountSection title={t('account.sectionPrivacy')}>
        <AccountRow icon="options-outline" label={t('account.preferences')} onPress={() => navigation.navigate('Preferences')} />
        <AccountRow icon="document-text-outline" label={t('account.legal')} onPress={() => navigation.navigate('Legal')} />
        <AccountRow icon="trash-outline" label={t('account.delete')} danger onPress={confirmDeletion} last />
      </AccountSection>

      <Button title={t('account.logout')} variant="secondary" onPress={confirmSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  soon: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#F1F4F2' },
  soonText: { fontSize: 12, fontWeight: '700', color: colors.muted },
});
