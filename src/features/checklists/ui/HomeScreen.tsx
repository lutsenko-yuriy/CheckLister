import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { useTheme } from '../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { useRuns } from '../../runs/useRuns';
import { ChecklistSummaryRow } from './components/ChecklistSummaryRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const { checklists, createChecklist } = useChecklists();
  const { history, historyLoading } = useRuns();
  const [newTitle, setNewTitle] = useState('');

  useLayoutEffect(() => {
    const showHistory = !historyLoading && history.length > 0;
    const historyButton = () => (
      <IconButton
        icon="history"
        accessibilityLabel="Run history"
        onPress={() => navigation.navigate('RunHistory', {})}
        color={colors.text}
      />
    );

    navigation.setOptions({
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
  }, [colors, history.length, historyLoading, navigation]);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) {
      return;
    }
    createChecklist(title);
    setNewTitle('');
  };

  return (
    <View style={styles.container} testID="home-screen">
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New checklist title"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
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
  const { colors, scheme } = useTheme();
  const styles = useStyles();
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
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
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
      <ChecklistSummaryRow
        checklist={checklist}
        onPress={onOpen}
        testID={`checklist-row-${checklist.title}`}
      />
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

const useStyles = createThemedStyles(colors => ({
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
  actionButton: {
    marginLeft: 12,
  },
}));
