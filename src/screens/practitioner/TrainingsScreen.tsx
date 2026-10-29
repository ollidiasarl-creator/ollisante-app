import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { myTrainings } from '../../api/endpoints';
import type { Training } from '../../api/types';
import { Banner, Button, Card, EmptyState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { formatDayLong, formatTime } from '../../lib/format';
import { colors, spacing, type } from '../../theme';

/** Formations et webinaires à venir pour le pays et les spécialités du professionnel. */
export default function TrainingsScreen() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        setItems(await myTrainings());
      } catch (e) {
        setError(errorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(i) => i.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      ListHeaderComponent={error ? <Banner text={error} /> : null}
      ListEmptyComponent={error ? null : <EmptyState title={t('training.emptyTitle')} text={t('training.emptyText')} />}
      renderItem={({ item }) => {
        const online = item.format === 'ONLINE';
        return (
          <Card accent={online ? colors.green : colors.terracotta}>
            <View style={styles.badgeRow}>
              <Ionicons name={online ? 'videocam' : 'location'} size={16} color={colors.green} />
              <Text style={styles.badge}>{t(online ? 'training.online' : 'training.inPerson')}</Text>
            </View>
            <Text style={type.h3}>{item.title}</Text>
            <Text style={type.body}>
              {formatDayLong(item.startsAt, locale)}, {formatTime(item.startsAt, locale)}
              {item.endsAt ? ` – ${formatTime(item.endsAt, locale)}` : ''}
            </Text>
            {item.location ? <Text style={type.small}>{item.location}</Text> : null}
            {item.description ? <Text style={type.small}>{item.description}</Text> : null}
            {item.linkUrl ? (
              <View style={styles.action}>
                <Button
                  title={t(online ? 'training.join' : 'training.register')}
                  variant="secondary"
                  onPress={() => void Linking.openURL(item.linkUrl!)}
                />
              </View>
            ) : null}
          </Card>
        );
      }}
      ListFooterComponent={items.length ? <Text style={type.small}>{t('booking.timezoneNote')}</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: { fontSize: 13, fontWeight: '700', color: colors.green },
  action: { marginTop: spacing.sm },
});
