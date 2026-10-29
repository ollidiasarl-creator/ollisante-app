import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { deleteAvailabilityRule, listAvailabilityRules } from '../../api/endpoints';
import type { AvailabilityRule } from '../../api/types';
import { Banner, Button, Card, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, spacing, type } from '../../theme';

export default function AvailabilityScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRules(await listAvailabilityRules());
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmDelete(rule: AvailabilityRule) {
    Alert.alert(t('avail.deleteTitle'), t('avail.deleteText'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('avail.deleteYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAvailabilityRule(rule.id);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={rules}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Banner kind="info" text={t('avail.verification')} />
          {error ? <Banner text={error} /> : null}
          <Button title={t('avail.add')} onPress={() => navigation.navigate('AddAvailability')} />
        </View>
      }
      ListEmptyComponent={<EmptyState title={t('avail.emptyTitle')} text={t('avail.emptyText')} />}
      renderItem={({ item }) => (
        <Card accent={item.mode === 'VIDEO' ? colors.green : colors.terracotta}>
          <Text style={type.h3}>{t(`weekday.${item.weekday}`)}</Text>
          <Text style={type.body}>
            {item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)}
          </Text>
          <Text style={type.small}>
            {t(`mode.${item.mode}`)} - {t('avail.slot', { minutes: item.slotMinutes })}
          </Text>
          <View style={styles.delete}>
            <Button title={t('avail.delete')} variant="warning" onPress={() => confirmDelete(item)} />
          </View>
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  separator: { height: spacing.md },
  delete: { marginTop: spacing.md },
});
