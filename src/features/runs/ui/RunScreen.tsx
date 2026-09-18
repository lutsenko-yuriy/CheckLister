import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useRuns } from '../useRuns';
import { checkedCount, isRunComplete } from '../domain/models';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { RunItemRow } from './components/RunItemRow';
import { colors } from '../../../shared/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Run'>;

export function RunScreen({ navigation }: Props) {
  const { activeRun, toggleItem, completeRun, clearRun } = useRuns();
  // State (not a ref): usePreventRemove needs a value it can react to across
  // renders — it disables native-stack's swipe-back gesture at the native
  // level while true, not just the JS-side beforeRemove event, avoiding a
  // "removed natively but didn't get removed from JS state" desync that a
  // manual beforeRemove + e.preventDefault() listener cannot prevent for the
  // swipe gesture (only for JS-dispatched actions like a header back press).
  const [justCompleted, setJustCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

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

  usePreventRemove(Boolean(activeRun) && !justCompleted, ({ data }) => {
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
            navigation.dispatch(data.action);
          },
        },
      ],
    );
  });

  // Deferred to an effect (not called inline in handleComplete) so
  // usePreventRemove's internal listener has already re-rendered with
  // justCompleted=true — and therefore preventRemove=false — before goBack()
  // runs; calling goBack() synchronously in the same tick as the state
  // update would race against that re-render.
  useEffect(() => {
    if (justCompleted) {
      clearRun();
      navigation.goBack();
    }
  }, [justCompleted, navigation, clearRun]);

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
    if (isCompleting) {
      return;
    }
    toggleItem(runItemId);
    analytics.logEvent('run_item_toggled', {
      checklist_id: activeRun.checklistId,
      checked: !wasChecked,
      checked_count: checkedCount(activeRun) + (wasChecked ? -1 : 1),
      item_count: activeRun.items.length,
    });
  };

  const handleComplete = async () => {
    if (isCompleting) {
      return;
    }
    setIsCompleting(true);
    try {
      await completeRun();
      analytics.logEvent('run_completed', {
        checklist_id: activeRun.checklistId,
        item_count: activeRun.items.length,
      });
      setJustCompleted(true);
    } catch {
      setIsCompleting(false);
      Alert.alert(
        'Could not complete run',
        'This run has not been saved. Please try again.',
      );
    }
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
        disabled={!complete || isCompleting}
        accessibilityRole="button"
        accessibilityLabel="Complete the checklist"
        accessibilityState={{ disabled: !complete || isCompleting }}
        style={[
          styles.completeButton,
          (!complete || isCompleting) && styles.completeButtonDisabled,
        ]}
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
    marginBottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
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
