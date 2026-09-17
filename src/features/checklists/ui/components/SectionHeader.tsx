import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Section } from '../../domain/models';

export function SectionHeader({
  section,
  onDelete,
  drag,
  isActive,
}: {
  section: Section | null;
  onDelete: () => void;
  drag: () => void;
  isActive: boolean;
}) {
  if (!section) {
    return <View style={[styles.header, styles.defaultHeader]} />;
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete section?',
      `"${section.name}" will be removed. Its items move to the default section.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <View style={[styles.header, isActive && styles.headerActive]}>
      <Pressable
        onLongPress={drag}
        style={styles.dragHandle}
        accessibilityLabel="Drag to reorder section"
      >
        <Text>≡</Text>
      </Pressable>
      <Text style={styles.headerText}>{section.name}</Text>
      <Pressable
        onPress={confirmDelete}
        style={styles.deleteButton}
        testID={`delete-section-${section.id}`}
      >
        <Text>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 12,
  },
  defaultHeader: {
    marginTop: 0,
  },
  headerActive: {
    backgroundColor: '#f0f0f0',
  },
  dragHandle: {
    marginRight: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#555',
  },
  deleteButton: {
    marginLeft: 12,
  },
});
