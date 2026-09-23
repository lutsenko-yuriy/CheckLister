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
import { useTheme } from '../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { analytics } from '../../../shared/analytics/AnalyticsService';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistSelect'>;

function waitForNextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

// Mirrors RunScreen's returnExternalResult: navigation is dispatched first,
// delivery (which foregrounds the caller app via Linking.openURL) waits a
// frame so it doesn't race the in-flight pop transition.
async function returnResult(
  callbackUrl: string,
  result: Parameters<typeof deliverExternalSelectResult>[1],
): Promise<void> {
  await waitForNextFrame();
  await deliverExternalSelectResult(callbackUrl, result);
}

export function ChecklistSelectScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
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
  }, [colors, navigation]);

  useLayoutEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (resolvedRef.current) {
        return;
      }
      resolvedRef.current = true;
      const callbackUrl = takePendingCallbackUrl();
      if (callbackUrl) {
        returnResult(callbackUrl, { status: 'cancelled' });
      }
    });
  }, [navigation, takePendingCallbackUrl]);

  const handleSelect = (checklist: Checklist) => {
    if (resolvedRef.current) {
      return;
    }
    resolvedRef.current = true;
    const callbackUrl = takePendingCallbackUrl();
    navigation.goBack();
    if (callbackUrl) {
      returnResult(callbackUrl, {
        status: 'selected',
        checklistId: checklist.id,
        checklistName: checklist.title,
      });
    }
  };

  return (
    <View style={styles.container} testID="checklist-select-screen">
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

const useStyles = createThemedStyles(colors => ({
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
}));
