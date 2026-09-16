import React, { useLayoutEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';
import { Item } from '../domain/models';
import { analytics } from '../../../shared/analytics/AnalyticsService';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistDetail'>;

export function ChecklistDetailScreen({ navigation, route }: Props) {
  const { checklists, addItem, toggleItem, editItem, deleteItem, clearCheckedItems } =
    useChecklists();
  const checklist = checklists.find(c => c.id === route.params.checklistId);
  const [newItemText, setNewItemText] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: checklist?.title ?? 'Checklist' });
  }, [navigation, checklist?.title]);

  useLayoutEffect(() => {
    if (checklist) {
      analytics.logScreenView('screen_checklist_detail', {
        item_count: checklist.items.length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist?.id]);

  if (!checklist) {
    return (
      <View style={styles.container}>
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

  const handleToggle = (item: Item) => {
    toggleItem(checklistId, item.id);
    analytics.logEvent('item_toggled', {
      checklist_id: checklistId,
      checked: !item.checked,
    });
  };

  const handleDelete = (itemId: string) => {
    deleteItem(checklistId, itemId);
    analytics.logEvent('item_deleted', { checklist_id: checklistId });
  };

  const handleClearChecked = () => {
    const clearedCount = checklist.items.filter(item => item.checked).length;
    clearCheckedItems(checklistId);
    analytics.logEvent('checked_items_cleared', {
      checklist_id: checklistId,
      cleared_count: clearedCount,
    });
  };

  const hasCheckedItems = checklist.items.some(item => item.checked);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{checklist.title}</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New item"
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable onPress={handleAdd} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {hasCheckedItems && (
        <Pressable onPress={handleClearChecked} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear checked</Text>
        </Pressable>
      )}

      {checklist.items.length === 0 ? (
        <Text style={styles.emptyState}>No items yet.</Text>
      ) : (
        <FlatList
          data={checklist.items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={text => {
                editItem(checklistId, item.id, text);
                analytics.logEvent('item_edited', {
                  checklist_id: checklistId,
                });
              }}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.text);

  const startEditing = () => {
    setDraftText(item.text);
    setIsEditing(true);
  };

  const save = () => {
    const text = draftText.trim();
    if (text) {
      onEdit(text);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={draftText}
          onChangeText={setDraftText}
          autoFocus
        />
        <Pressable onPress={save} style={styles.actionButton}>
          <Text>Save</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsEditing(false)}
          style={styles.actionButton}
        >
          <Text>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowBody} onPress={onToggle}>
        <Text style={item.checked ? styles.itemTextChecked : styles.itemText}>
          {item.text}
        </Text>
      </Pressable>
      <Pressable onPress={startEditing} style={styles.actionButton}>
        <Text>Edit</Text>
      </Pressable>
      <Pressable onPress={onDelete} style={styles.actionButton}>
        <Text>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addButton: {
    marginLeft: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  addButtonText: {
    fontWeight: '600',
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  clearButtonText: {
    color: '#c00',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowBody: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
  },
  itemTextChecked: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    color: '#999',
  },
  actionButton: {
    marginLeft: 12,
  },
});
