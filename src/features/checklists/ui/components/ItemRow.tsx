import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Item } from '../../domain/models';
import { IconButton } from '../../../../shared/ui/IconButton';
import { colors } from '../../../../shared/theme/colors';

// ChecklistDetailScreen's Sortable list positions rows using this fixed
// height, so the row's actual rendered height must never exceed it —
// hence the item text below is capped to one line.
export const ITEM_ROW_HEIGHT = 56;

export function ItemRow({
  item,
  onEdit,
  onDelete,
  dragHandle,
  isDragging = false,
}: {
  item: Item;
  onEdit: (text: string) => void;
  onDelete: () => void;
  dragHandle: React.ReactNode;
  isDragging?: boolean;
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
      <View style={[styles.row, isDragging && styles.rowDragging]}>
        <TextInput
          style={styles.input}
          value={draftText}
          onChangeText={setDraftText}
          autoFocus
        />
        <IconButton
          icon="check"
          accessibilityLabel="Save"
          onPress={save}
          style={styles.actionButton}
        />
        <IconButton
          icon="close"
          accessibilityLabel="Cancel"
          onPress={() => setIsEditing(false)}
          style={styles.actionButton}
        />
      </View>
    );
  }

  return (
    <View style={[styles.row, isDragging && styles.rowDragging]}>
      {dragHandle}
      <View style={styles.rowBody}>
        <Text style={styles.itemText} numberOfLines={1}>
          {item.text}
        </Text>
      </View>
      <IconButton
        icon="edit"
        accessibilityLabel="Edit"
        onPress={startEditing}
        style={styles.actionButton}
      />
      <IconButton
        icon="delete"
        accessibilityLabel="Delete"
        onPress={onDelete}
        color={colors.danger}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowDragging: {
    shadowColor: colors.dragLift,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  rowBody: {
    flex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
    color: colors.text,
  },
  itemText: {
    fontSize: 16,
    color: colors.text,
  },
  actionButton: {
    marginLeft: 12,
  },
});
