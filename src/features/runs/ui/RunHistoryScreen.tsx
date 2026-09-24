import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { RunHistoryEntry } from '../domain/models';
import { useRuns } from '../useRuns';
import { useI18n } from '../../../shared/i18n/useI18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RunHistory'>;

export function RunHistoryScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const { t } = useI18n();
  const { history, historyLoading } = useRuns();
  const { checklistId, checklistTitle } = route.params;
  const hasLoggedView = useRef(false);
  const visibleEntries = useMemo(
    () =>
      checklistId
        ? history.filter(entry => entry.checklistId === checklistId)
        : history,
    [checklistId, history],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        checklistId && checklistTitle
          ? t('runHistory.checklistTitle', { title: checklistTitle })
          : t('common.runHistory'),
    });
  }, [checklistId, checklistTitle, navigation, t]);

  useEffect(() => {
    if (historyLoading || hasLoggedView.current) {
      return;
    }
    hasLoggedView.current = true;
    analytics.logScreenView('screen_run_history', {
      scope: checklistId ? 'checklist' : 'all',
      entry_count: visibleEntries.length,
      ...(checklistId ? { checklist_id: checklistId } : {}),
    });
  }, [checklistId, historyLoading, visibleEntries.length]);

  return (
    <View style={styles.container} testID="run-history-screen">
      {visibleEntries.length === 0 ? (
        <Text style={styles.emptyState}>{t('runHistory.emptyState')}</Text>
      ) : (
        <FlatList
          data={visibleEntries}
          keyExtractor={entry => entry.id}
          renderItem={({ item }) => <RunHistoryRow entry={item} />}
        />
      )}
    </View>
  );
}

function RunHistoryRow({ entry }: { entry: RunHistoryEntry }) {
  const styles = useStyles();
  const { t, formatDateTime } = useI18n();
  return (
    <View style={styles.row} testID={`run-history-entry-${entry.id}`}>
      <Text style={styles.rowTitle}>{entry.checklistTitle}</Text>
      <Text style={styles.rowSubtitle}>
        {t('runHistory.row', {
          count: entry.itemCount,
          date: formatDateTime(entry.completedAt),
        })}
      </Text>
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    fontSize: 16,
    color: colors.text,
  },
  rowSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.textMuted,
  },
}));
