import React, { useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';
import { Checklist } from '../domain/models';
import { IconButton } from '../../../shared/ui/IconButton';
import { useTheme } from '../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { useRuns } from '../../runs/useRuns';
import { useI18n } from '../../../shared/i18n/useI18n';
import { ChecklistSummaryRow } from './components/ChecklistSummaryRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const { checklists, createChecklist } = useChecklists();
  const { history, historyLoading } = useRuns();
  const [newTitle, setNewTitle] = useState('');

  useLayoutEffect(() => {
    const showHistory = !historyLoading && history.length > 0;
    const historyButton = () => (
      <IconButton
        icon="history"
        accessibilityLabel={t('common.runHistory')}
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
  }, [colors, history.length, historyLoading, navigation, t]);

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
          placeholder={t('home.newChecklistPlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <IconButton
          icon="add"
          accessibilityLabel={t('common.add')}
          onPress={handleAdd}
          style={styles.addButton}
        />
      </View>

      {checklists.length === 0 ? (
        <Text style={styles.emptyState}>{t('home.emptyState')}</Text>
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
  const { t } = useI18n();
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
    Alert.alert(t('home.deleteConfirmTitle'), t('home.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteChecklist(checklist.id),
      },
    ]);
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
          accessibilityLabel={t('common.save')}
          onPress={save}
          style={styles.actionButton}
        />
        <IconButton
          icon="close"
          accessibilityLabel={t('common.cancel')}
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
        accessibilityLabel={t('common.rename')}
        onPress={startEditing}
        style={styles.actionButton}
      />
      <IconButton
        icon="delete"
        accessibilityLabel={t('common.delete')}
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
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  actionButton: {
    marginLeft: 12,
  },
}));
