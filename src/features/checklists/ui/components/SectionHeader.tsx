import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Section } from '../../domain/models';

export const SECTION_HEADER_HEIGHT = 48;

export function SectionHeader({
  section,
  onDelete,
  dragHandle,
}: {
  section: Section | null;
  onDelete: () => void;
  dragHandle: React.ReactNode;
}) {
  if (!section) {
    return <View style={styles.header} />;
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
    <View style={styles.header}>
      {dragHandle}
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
    height: SECTION_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
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
