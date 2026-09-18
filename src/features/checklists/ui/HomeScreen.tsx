import React, { useState } from 'react';
import {
  Alert,
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
import { Checklist } from '../domain/models';
import { IconButton } from '../../../shared/ui/IconButton';
import { colors } from '../../../shared/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { checklists, createChecklist } = useChecklists();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) {
      return;
    }
    createChecklist(title);
    setNewTitle('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New checklist title"
          value={newTitle}
          onChangeText={setNewTitle}
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

      {checklists.length === 0 ? (
        <Text style={styles.emptyState}>No checklists yet.</Text>
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChecklistRow
              checklist={item}
              onOpen={() =>
                navigation.navigate('ChecklistDetail', { checklistId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ChecklistRow({
  checklist,
  onOpen,
}: {
  checklist: Checklist;
  onOpen: () => void;
}) {
  const { renameChecklist, deleteChecklist } = useChecklists();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(checklist.title);

  const startEditing = () => {
    setDraftTitle(checklist.title);
    setIsEditing(true);
  };

  const save = () => {
    const title = draftTitle.trim();
    if (title) {
      renameChecklist(checklist.id, title);
    }
    setIsEditing(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete checklist?',
      'This will delete all of its items. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteChecklist(checklist.id),
        },
      ],
    );
  };

  if (isEditing) {
    return (
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={draftTitle}
          onChangeText={setDraftTitle}
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
      <Pressable style={styles.rowBody} onPress={onOpen}>
        <Text style={styles.rowTitle}>{checklist.title}</Text>
        {checklist.items.length > 0 && (
          <Text style={styles.rowSubtitle}>
            {checklist.items.length} item
            {checklist.items.length === 1 ? '' : 's'}
          </Text>
        )}
      </Pressable>
      <IconButton
        icon="edit"
        accessibilityLabel="Rename"
        onPress={startEditing}
        style={styles.actionButton}
      />
      <IconButton
        icon="delete"
        accessibilityLabel="Delete"
        testID={`delete-checklist-${checklist.title}`}
        onPress={confirmDelete}
        color={colors.danger}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: colors.text,
  },
  rowSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: 12,
  },
});
