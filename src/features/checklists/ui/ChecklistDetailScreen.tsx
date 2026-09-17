import React, { useLayoutEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Sortable, SortableItem } from 'react-native-reanimated-dnd';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';
import {
  buildRows,
  resolveItemDrop,
  resolveSectionDrop,
  Row,
} from '../domain/models';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { ItemRow, ITEM_ROW_HEIGHT } from './components/ItemRow';
import {
  SectionHeader,
  SECTION_HEADER_HEIGHT,
} from './components/SectionHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistDetail'>;

type SortableRow = Row & { id: string };

function rowId(row: Row): string {
  return row.kind === 'item'
    ? `item:${row.item.id}`
    : `section:${row.section ? row.section.id : 'default'}`;
}

export function ChecklistDetailScreen({ navigation, route }: Props) {
  const {
    checklists,
    addItem,
    editItem,
    deleteItem,
    addSection,
    deleteSection,
    moveItem,
    moveSection,
  } = useChecklists();
  const checklist = checklists.find(c => c.id === route.params.checklistId);
  const [newItemText, setNewItemText] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: checklist?.title ?? 'Checklist' });
  }, [navigation, checklist?.title]);

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
      <View style={styles.container}>
        <Text style={styles.emptyState}>Checklist not found.</Text>
      </View>
    );
  }

  const checklistId = checklist.id;
  const rows: SortableRow[] = buildRows(checklist).map(row => ({
    ...row,
    id: rowId(row),
  }));

  const handleAdd = () => {
    const text = newItemText.trim();
    if (!text) {
      return;
    }
    addItem(checklistId, text, selectedSectionId);
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

  const handleAddSection = () => {
    const name = newSectionName.trim();
    if (!name) {
      return;
    }
    addSection(checklistId, name);
    analytics.logEvent('section_added', {
      checklist_id: checklistId,
      section_count: checklist.sections.length + 1,
    });
    setNewSectionName('');
    setIsAddingSection(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSection(checklistId, sectionId);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  };

  const handleDrop = (
    id: string,
    _position: number,
    allPositions?: { [rowId: string]: number },
  ) => {
    if (!allPositions) {
      return;
    }
    const draggedRow = rows.find(row => row.id === id);
    if (!draggedRow) {
      return;
    }
    const newRows = rows
      .slice()
      .sort((a, b) => (allPositions[a.id] ?? 0) - (allPositions[b.id] ?? 0));

    if (draggedRow.kind === 'item') {
      const itemId = draggedRow.item.id;
      const fromIndex = checklist.items.findIndex(i => i.id === itemId);
      const fromSectionId = draggedRow.item.sectionId;
      const { toSectionId, toIndex } = resolveItemDrop(newRows, itemId);

      moveItem(checklistId, itemId, toSectionId, toIndex);

      if (toSectionId === fromSectionId) {
        analytics.logEvent('item_reordered', {
          checklist_id: checklistId,
          from_index: fromIndex,
          to_index: toIndex,
          section_id: toSectionId,
        });
      } else {
        analytics.logEvent('item_moved_to_section', {
          checklist_id: checklistId,
          from_section_id: fromSectionId,
          to_section_id: toSectionId,
        });
      }
    } else if (draggedRow.section) {
      const sectionId = draggedRow.section.id;
      const fromIndex = checklist.sections.findIndex(s => s.id === sectionId);
      const toIndex = resolveSectionDrop(newRows, sectionId);

      moveSection(checklistId, sectionId, toIndex);

      analytics.logEvent('section_reordered', {
        checklist_id: checklistId,
        from_index: fromIndex,
        to_index: toIndex,
      });
    }
    // Dragging the default (null) section header is a no-op: it isn't a
    // real entry in `sections` and can't be reordered.
  };

  const hasSections = checklist.sections.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{checklist.title}</Text>

      {hasSections && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
        >
          <SectionChip
            testID="section-chip-default"
            label="No section"
            selected={selectedSectionId === null}
            onPress={() => setSelectedSectionId(null)}
          />
          {checklist.sections.map(section => (
            <SectionChip
              key={section.id}
              testID={`section-chip-${section.id}`}
              label={section.name}
              selected={selectedSectionId === section.id}
              onPress={() => setSelectedSectionId(section.id)}
            />
          ))}
        </ScrollView>
      )}

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

      {isAddingSection ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Section name"
            value={newSectionName}
            onChangeText={setNewSectionName}
            onSubmitEditing={handleAddSection}
            returnKeyType="done"
            autoFocus
          />
          <Pressable onPress={handleAddSection} style={styles.addButton}>
            <Text style={styles.addButtonText}>Save</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setNewSectionName('');
              setIsAddingSection(false);
            }}
            style={styles.addButton}
          >
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setIsAddingSection(true)}
          style={styles.newSectionButton}
        >
          <Text style={styles.newSectionButtonText}>+ New section</Text>
        </Pressable>
      )}

      {checklist.items.length === 0 && !hasSections ? (
        <Text style={styles.emptyState}>No items yet.</Text>
      ) : (
        <Sortable
          data={rows}
          itemKeyExtractor={row => row.id}
          itemHeight={row =>
            row.kind === 'section' ? SECTION_HEADER_HEIGHT : ITEM_ROW_HEIGHT
          }
          renderItem={({
            item: row,
            id,
            positions,
            lowerBound,
            autoScrollDirection,
            itemsCount,
            itemHeight,
          }) => {
            const dragHandle = (
              <SortableItem.Handle style={styles.dragHandle}>
                <Text>≡</Text>
              </SortableItem.Handle>
            );
            return (
              <SortableItem
                key={id}
                id={id}
                data={row}
                positions={positions}
                lowerBound={lowerBound}
                autoScrollDirection={autoScrollDirection}
                itemsCount={itemsCount}
                itemHeight={itemHeight}
                onDrop={handleDrop}
              >
                {row.kind === 'section' ? (
                  <SectionHeader
                    section={row.section}
                    onDelete={() => {
                      if (row.section) {
                        handleDeleteSection(row.section.id);
                      }
                    }}
                    dragHandle={dragHandle}
                  />
                ) : (
                  <ItemRow
                    item={row.item}
                    onEdit={text => {
                      editItem(checklistId, row.item.id, text);
                      analytics.logEvent('item_edited', {
                        checklist_id: checklistId,
                      });
                    }}
                    onDelete={() => handleDelete(row.item.id)}
                    dragHandle={dragHandle}
                  />
                )}
              </SortableItem>
            );
          }}
        />
      )}
    </View>
  );
}

function SectionChip({
  testID,
  label,
  selected,
  onPress,
}: {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>
        {label}
      </Text>
    </Pressable>
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
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  chipText: {
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
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
  newSectionButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  newSectionButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
  dragHandle: {
    marginRight: 12,
    paddingHorizontal: 4,
  },
});
