import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getFaq } from '../../api/endpoints';
import type { FaqEntry } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Banner, EmptyState, Loading, Screen } from '../../components/ui';
import { SupportButtons } from '../../components/SupportButtons';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, spacing, type } from '../../theme';

/** Questions fréquentes (patients ou professionnels) ; touchez une question pour lire la réponse. */
export default function FaqScreen({ navigation }: { navigation: any }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<FaqEntry[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFaq(user?.role === 'PRACTITIONER' || user?.role === 'STRUCTURE' ? 'PRACTITIONER' : 'PATIENT')
      .then(setItems)
      .catch((e) => setError(errorMessage(e, t)));
  }, [user?.role, t]);

  if (!items && !error) return <Loading />;
  const question = (f: FaqEntry) => (lang === 'en' && f.questionEn && f.answerEn ? f.questionEn : f.questionFr);
  const answer = (f: FaqEntry) => (lang === 'en' && f.questionEn && f.answerEn ? f.answerEn : f.answerFr);

  return (
    <Screen>
      {error ? <Banner text={error} /> : null}
      {items && items.length === 0 ? <EmptyState title={t('faq.emptyTitle')} text={t('faq.emptyText')} /> : null}
      {(items ?? []).map((f) => {
        const expanded = open === f.id;
        return (
          <View key={f.id} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : f.id)}
              style={styles.question}
            >
              <Text style={[type.h3, styles.flex]}>{question(f)}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
            </Pressable>
            {expanded ? <Text style={type.body}>{answer(f)}</Text> : null}
          </View>
        );
      })}
      <SupportButtons navigation={navigation} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md, gap: spacing.sm },
  question: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  flex: { flex: 1 },
});
