import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Item } from '../../domain/models';

export const ITEM_ROW_HEIGHT = 56;

export function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
  dragHandle,
}: {
  item: Item;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  dragHandle: React.ReactNode;
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
      {dragHandle}
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
  row: {
    height: ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowBody: {
    flex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
