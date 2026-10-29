import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { deleteRelative, getRelatives } from '../../api/endpoints';
import type { Relative } from '../../api/types';
import { AccountRow, AccountSection } from '../../components/AccountList';
import { Button, EmptyState, Screen } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { type } from '../../theme';

/** Compte → Mes proches : ajoutez et gérez les profils de vos proches, pour prendre rendez-vous pour eux. */
export default function RelativesScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [list, setList] = useState<Relative[] | null>(null);

  const load = useCallback(() => {
    getRelatives()
      .then(setList)
      .catch((e) => Alert.alert(t('common.error'), errorMessage(e, t)));
  }, [t]);
  useFocusEffect(load);

  function remove(r: Relative) {
    Alert.alert(t('relatives.removeTitle', { name: `${r.firstName} ${r.lastName}` }), undefined, [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('relatives.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRelative(r.id);
            load();
          } catch (e) {
            Alert.alert(t('common.error'), errorMessage(e, t));
          }
        },
      },
    ]);
  }

  return (
    <Screen footer={<Button title={t('relatives.add')} onPress={() => navigation.navigate('RelativeEdit')} />}>
      <Text style={type.small}>{t('relatives.intro')}</Text>
      {list && list.length === 0 ? <EmptyState title={t('relatives.empty')} /> : null}
      {list && list.length ? (
        <AccountSection>
          {list.map((r, i) => (
            <AccountRow
              key={r.id}
              icon="people-outline"
              label={`${r.firstName} ${r.lastName}`}
              value={t(`relatives.relation.${r.relation}`)}
              onPress={() =>
                Alert.alert(`${r.firstName} ${r.lastName}`, undefined, [
                  { text: t('relatives.edit'), onPress: () => navigation.navigate('RelativeEdit', { relative: r }) },
                  { text: t('relatives.remove'), style: 'destructive', onPress: () => remove(r) },
                  { text: t('common.close'), style: 'cancel' },
                ])
              }
              last={i === list.length - 1}
            />
          ))}
        </AccountSection>
      ) : null}
    </Screen>
  );
}
