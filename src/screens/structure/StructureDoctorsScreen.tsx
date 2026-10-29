import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { inviteMember, removeMember, structureMembers } from '../../api/endpoints';
import type { StructureMember } from '../../api/types';
import { Banner, Button, Card, EmptyState, Loading, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { isEmail } from '../../lib/format';
import { colors, spacing, type } from '../../theme';

/** Médecins rattachés à la structure : invitation par e-mail et retrait. */
export default function StructureDoctorsScreen() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<StructureMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await structureMembers());
    } catch (e) {
      setError(errorMessage(e, t));
      setItems([]);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function invite() {
    if (!isEmail(email)) return setError(t('email.invalidOnly'));
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      await inviteMember(email.trim().toLowerCase());
      setEmail('');
      setInfo(t('structure.invited'));
      await load();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setSending(false);
    }
  }

  function confirmRemove(m: StructureMember) {
    const name = `${m.firstName} ${m.lastName}`;
    Alert.alert(t('structure.removeTitle', { name }), t('structure.removeText'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('structure.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(m.practitionerId);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  if (!items) return <Loading />;

  const header = (
    <View style={styles.header}>
      <Text style={type.body}>{t('structure.inviteText')}</Text>
      <TextField
        label={t('structure.inviteEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title={t('structure.invite')} onPress={() => void invite()} loading={sending} />
      {info ? <Banner kind="info" text={info} /> : null}
      {error ? <Banner text={error} /> : null}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(m) => m.practitionerId}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState title={t('structure.noDoctors')} />}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Card accent={item.status === 'ACTIVE' ? colors.green : colors.gold}>
            <Text style={type.h3}>
              {t('book.doctor')} {item.firstName} {item.lastName}
            </Text>
            <Text style={type.small}>
              {item.specialties.map((s) => (lang === 'fr' ? s.nameFr : s.nameEn)).join(', ')}
            </Text>
            <Text style={type.small}>{t(`member.${item.status}`)}</Text>
            <View style={styles.actions}>
              <Button title={t('structure.remove')} variant="ghost" onPress={() => confirmRemove(item)} />
            </View>
          </Card>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  item: { marginBottom: spacing.md },
  actions: { marginTop: spacing.sm },
});
