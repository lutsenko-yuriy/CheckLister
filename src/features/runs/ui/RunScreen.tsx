import React, { useLayoutEffect, useRef } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useRuns } from '../useRuns';
import { checkedCount, isRunComplete } from '../domain/models';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { RunItemRow } from './components/RunItemRow';
import { colors } from '../../../shared/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Run'>;

export function RunScreen({ navigation }: Props) {
  const { activeRun, toggleItem, completeRun, clearRun } = useRuns();
  // A ref (not state) so the beforeRemove listener always reads the latest
  // value synchronously — handleComplete sets this and calls goBack() in the
  // same tick, before a state update would have re-rendered the listener's
  // closure.
  const justCompletedRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: activeRun?.checklistTitle ?? 'Run' });
  }, [navigation, activeRun?.checklistTitle]);

  useLayoutEffect(() => {
    if (!activeRun) {
      return;
    }
    analytics.logScreenView('screen_checklist_run', {
      checklist_id: activeRun.checklistId,
      item_count: activeRun.items.length,
    });
    // Deliberately keyed on run id only: should fire once per run, not
    // re-fire as items are toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.id]);

  useLayoutEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (justCompletedRef.current) {
          return;
        }
        e.preventDefault();
        Alert.alert(
          'Are you sure?',
          'Leaving now will discard this run. Your progress will not be saved.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                clearRun();
                navigation.dispatch(e.data.action);
              },
            },
          ],
        );
      }),
    [navigation, clearRun],
  );

  if (!activeRun) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyState}>No active run.</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleToggle = (runItemId: string, wasChecked: boolean) => {
    toggleItem(runItemId);
    analytics.logEvent('run_item_toggled', {
      checklist_id: activeRun.checklistId,
      checked: !wasChecked,
      checked_count: checkedCount(activeRun) + (wasChecked ? -1 : 1),
      item_count: activeRun.items.length,
    });
  };

  const handleComplete = () => {
    analytics.logEvent('run_completed', {
      checklist_id: activeRun.checklistId,
      item_count: activeRun.items.length,
    });
    justCompletedRef.current = true;
    completeRun();
    clearRun();
    navigation.goBack();
  };

  const complete = isRunComplete(activeRun);

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {checkedCount(activeRun)} of {activeRun.items.length} checked
      </Text>
      <FlatList
        data={activeRun.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RunItemRow
            item={item}
            onToggle={() => handleToggle(item.id, item.checked)}
          />
        )}
      />
      <Pressable
        onPress={handleComplete}
        disabled={!complete}
        accessibilityRole="button"
        accessibilityLabel="Complete the checklist"
        accessibilityState={{ disabled: !complete }}
        style={[styles.completeButton, !complete && styles.completeButtonDisabled]}
      >
        <Text style={styles.completeButtonText}>Complete the checklist</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  progress: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  completeButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: colors.border,
  },
  completeButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.textMuted,
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
});
