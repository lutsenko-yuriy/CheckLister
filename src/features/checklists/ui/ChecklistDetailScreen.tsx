import React, { useLayoutEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sortable, SortableItem } from 'react-native-reanimated-dnd';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';
import { useRuns } from '../../runs/useRuns';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { ItemRow, ITEM_ROW_HEIGHT } from './components/ItemRow';
import { IconButton } from '../../../shared/ui/IconButton';
import { useTheme } from '../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistDetail'>;

export function ChecklistDetailScreen({ navigation, route }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const { checklists, addItem, editItem, deleteItem, moveItem } =
    useChecklists();
  const { startRun, history, historyLoading } = useRuns();
  const checklist = checklists.find(c => c.id === route.params.checklistId);
  const [newItemText, setNewItemText] = useState('');
  const hasHistory = history.some(
    entry => entry.checklistId === route.params.checklistId,
  );

  useLayoutEffect(() => {
    const showHistory = Boolean(checklist) && !historyLoading && hasHistory;
    const historyButton = () => (
      <IconButton
        icon="history"
        accessibilityLabel="Run history"
        onPress={() =>
          checklist &&
          navigation.navigate('RunHistory', {
            checklistId: checklist.id,
            checklistTitle: checklist.title,
          })
        }
        color={colors.text}
      />
    );

    navigation.setOptions({
      title: checklist?.title ?? 'Checklist',
      headerRight: showHistory ? historyButton : undefined,
      unstable_headerRightItems: showHistory
        ? () => [
            {
              type: 'custom',
              element: historyButton(),
              hidesSharedBackground: true,
            },
          ]
        : undefined,
    });
  }, [checklist, colors, hasHistory, historyLoading, navigation]);

  useLayoutEffect(() => {
    if (checklist) {
      analytics.logScreenView('screen_checklist_detail', {
        item_count: checklist.items.length,
      });
    }
    // Deliberately keyed on checklist id only: this should fire once per
    // screen visit, not re-fire every time item_count changes from a
    // mutation on this same screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist?.id]);

  if (!checklist) {
    return (
      <View style={styles.container} testID="checklist-detail-screen">
        <Text style={styles.emptyState}>Checklist not found.</Text>
      </View>
    );
  }

  const checklistId = checklist.id;

  const handleAdd = () => {
    const text = newItemText.trim();
    if (!text) {
      return;
    }
    addItem(checklistId, text);
    analytics.logEvent('item_added', {
      checklist_id: checklistId,
      item_count: checklist.items.length + 1,
    });
    setNewItemText('');
  };

  const handleDelete = (itemId: string) => {
    deleteItem(checklistId, itemId);
    analytics.logEvent('item_deleted', { checklist_id: checklistId });
  };

  const handleStartRun = () => {
    startRun(checklist);
    analytics.logEvent('run_started', {
      checklist_id: checklistId,
      item_count: checklist.items.length,
    });
    navigation.navigate('Run', { checklistId });
  };

  const handleDrop = (
    id: string,
    _position: number,
    allPositions?: { [itemId: string]: number },
  ) => {
    if (!allPositions) {
      return;
    }
    const fromIndex = checklist.items.findIndex(item => item.id === id);
    if (fromIndex === -1) {
      return;
    }
    const toIndex = allPositions[id] ?? fromIndex;

    moveItem(checklistId, id, toIndex);
    analytics.logEvent('item_reordered', {
      checklist_id: checklistId,
      from_index: fromIndex,
      to_index: toIndex,
    });
  };

  return (
    <View style={styles.container} testID="checklist-detail-screen">
      <Text style={styles.title}>{checklist.title}</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New item"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <IconButton
          icon="add"
          accessibilityLabel="Add"
          onPress={handleAdd}
          style={styles.addButton}
        />
      </View>

      <Pressable
        onPress={handleStartRun}
        disabled={checklist.items.length === 0}
        accessibilityRole="button"
        accessibilityLabel="Start run"
        accessibilityState={{ disabled: checklist.items.length === 0 }}
        style={[
          styles.startRunButton,
          checklist.items.length === 0 && styles.startRunButtonDisabled,
        ]}
      >
        <Text style={styles.startRunButtonText}>Start run</Text>
      </Pressable>

      {checklist.items.length === 0 ? (
        <Text style={styles.emptyState}>No items yet.</Text>
      ) : (
        <Sortable
          data={checklist.items}
          style={styles.sortableList}
          itemKeyExtractor={item => item.id}
          itemHeight={ITEM_ROW_HEIGHT}
          keyboardShouldPersistTaps="handled"
          renderItem={({
            item,
            id,
            positions,
            lowerBound,
            autoScrollDirection,
            itemsCount,
            itemHeight,
          }) => {
            const dragHandle = (
              <SortableItem.Handle style={styles.dragHandle}>
                <View testID={`drag-handle-${item.text}`}>
                  <Text>≡</Text>
                </View>
              </SortableItem.Handle>
            );
            return (
              <SortableItem
                key={id}
                id={id}
                data={item}
                positions={positions}
                lowerBound={lowerBound}
                autoScrollDirection={autoScrollDirection}
                itemsCount={itemsCount}
                itemHeight={itemHeight}
                onDrop={handleDrop}
              >
                <ItemRow
                  item={item}
                  onEdit={text => {
                    editItem(checklistId, item.id, text);
                    analytics.logEvent('item_edited', {
                      checklist_id: checklistId,
                    });
                  }}
                  onDelete={() => handleDelete(item.id)}
                  dragHandle={dragHandle}
                />
              </SortableItem>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  addButton: {
    marginLeft: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.textMuted,
  },
  startRunButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  startRunButtonDisabled: {
    backgroundColor: colors.border,
  },
  startRunButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  dragHandle: {
    marginRight: 12,
    paddingHorizontal: 4,
  },
  sortableList: {
    backgroundColor: colors.background,
  },
}));
