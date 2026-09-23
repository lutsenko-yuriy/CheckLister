import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Item } from '../../domain/models';
import { IconButton } from '../../../../shared/ui/IconButton';
import { useTheme } from '../../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';

// ChecklistDetailScreen's Sortable list positions rows using this fixed
// height, so the row's actual rendered height must never exceed it —
// hence the item text below is capped to one line.
export const ITEM_ROW_HEIGHT = 56;

export function ItemRow({
  item,
  onEdit,
  onDelete,
  dragHandle,
}: {
  item: Item;
  onEdit: (text: string) => void;
  onDelete: () => void;
  dragHandle: React.ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
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
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
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
    <View style={styles.row}>
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
        testID={`edit-item-${item.text}`}
      />
      <IconButton
        icon="delete"
        accessibilityLabel="Delete"
        onPress={onDelete}
        color={colors.danger}
        style={styles.actionButton}
        testID={`delete-item-${item.text}`}
      />
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  row: {
    height: ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
}));
