import React, { useLayoutEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';
import { useExternalSelection } from '../useExternalSelection';
import { deliverExternalSelectResult } from '../externalSelectCallbackDelivery';
import { Checklist } from '../domain/models';
import { ChecklistSummaryRow } from './components/ChecklistSummaryRow';
import { IconButton } from '../../../shared/ui/IconButton';
import { colors } from '../../../shared/theme/colors';
import { analytics } from '../../../shared/analytics/AnalyticsService';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistSelect'>;

export function ChecklistSelectScreen({ navigation }: Props) {
  const { checklists, loading } = useChecklists();
  const { takePendingCallbackUrl } = useExternalSelection();
  // Whichever of a row tap or the beforeRemove dismissal fires first
  // consumes the pending callback URL; this ref just keeps the loser quiet
  // (takePendingCallbackUrl's read-and-clear is what actually enforces
  // exactly-once delivery).
  const resolvedRef = useRef(false);

  useLayoutEffect(() => {
    if (loading) {
      return;
    }
    analytics.logScreenView('screen_checklist_select', {
      checklist_count: checklists.length,
    });
    // Fire once hydration completes, not on every subsequent checklists
    // change during this screen visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useLayoutEffect(() => {
    const cancel = () => {
      const accessibilityLabel = 'Cancel';
      return (
        <IconButton
          icon="close"
          accessibilityLabel={accessibilityLabel}
          onPress={() => navigation.goBack()}
          color={colors.text}
        />
      );
    };

    navigation.setOptions({
      headerRight: cancel,
      unstable_headerRightItems: () => [
        {
          type: 'custom',
          element: cancel(),
          hidesSharedBackground: true,
        },
      ],
    });
  }, [navigation]);

  useLayoutEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (resolvedRef.current) {
        return;
      }
      resolvedRef.current = true;
      const callbackUrl = takePendingCallbackUrl();
      if (callbackUrl) {
        deliverExternalSelectResult(callbackUrl, { status: 'cancelled' });
      }
    });
  }, [navigation, takePendingCallbackUrl]);

  const handleSelect = (checklist: Checklist) => {
    if (resolvedRef.current) {
      return;
    }
    resolvedRef.current = true;
    const callbackUrl = takePendingCallbackUrl();
    if (callbackUrl) {
      deliverExternalSelectResult(callbackUrl, {
        status: 'selected',
        checklistId: checklist.id,
        checklistName: checklist.title,
      });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={checklists}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ChecklistSummaryRow
              checklist={item}
              onPress={() => handleSelect(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
