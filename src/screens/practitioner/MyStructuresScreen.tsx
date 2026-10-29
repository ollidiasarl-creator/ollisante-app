import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { acceptOrganization, leaveOrganization, myOrganizations } from '../../api/endpoints';
import type { Membership } from '../../api/types';
import { Banner, Button, Card, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, spacing, type } from '../../theme';

/** Médecin : invitations reçues des structures et rattachements en cours. */
export default function MyStructuresScreen() {
  const { t } = useI18n();
  const [items, setItems] = useState<Membership[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await myOrganizations());
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

  async function accept(m: Membership) {
    try {
      await acceptOrganization(m.organizationId);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, t));
    }
  }

  function confirmLeave(m: Membership) {
    const invited = m.status === 'INVITED';
    Alert.alert(
      t(invited ? 'myorg.declineTitle' : 'myorg.leaveTitle', { name: m.name }),
      invited ? undefined : t('myorg.leaveText'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t(invited ? 'myorg.decline' : 'myorg.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrganization(m.organizationId);
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), errorMessage(e, t));
            }
          },
        },
      ],
    );
  }

  if (!items) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(m) => m.organizationId}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={type.body}>{t('myorg.intro')}</Text>
          {error ? <Banner text={error} /> : null}
        </View>
      }
      ListEmptyComponent={<EmptyState title={t('myorg.empty')} />}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Card accent={item.status === 'ACTIVE' ? colors.green : colors.gold}>
            <Text style={type.h3}>{item.name}</Text>
            <Text style={type.small}>{[t(`org.${item.type}`), item.city].filter(Boolean).join(' · ')}</Text>
            <Text style={type.small}>{t(`member.${item.status}`)}</Text>
            <View style={styles.actions}>
              {item.status === 'INVITED' ? (
                <Button title={t('myorg.accept')} onPress={() => void accept(item)} />
              ) : null}
              <Button
                title={t(item.status === 'INVITED' ? 'myorg.decline' : 'myorg.leave')}
                variant="ghost"
                onPress={() => confirmLeave(item)}
              />
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
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
