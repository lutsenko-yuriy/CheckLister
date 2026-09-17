import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Section } from '../../domain/models';
import { IconButton } from '../../../../shared/ui/IconButton';
import { colors } from '../../../../shared/theme/colors';

// ChecklistDetailScreen's Sortable list positions rows using this fixed
// height, so the row's actual rendered height must never exceed it —
// hence the section name below is capped to one line.
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
      <Text style={styles.headerText} numberOfLines={1}>
        {section.name}
      </Text>
      <IconButton
        icon="delete"
        accessibilityLabel="Delete"
        onPress={confirmDelete}
        color={colors.danger}
        style={styles.deleteButton}
        testID={`delete-section-${section.id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: SECTION_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  deleteButton: {
    marginLeft: 12,
  },
});
