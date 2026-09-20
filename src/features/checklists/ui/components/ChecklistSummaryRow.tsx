import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Checklist } from '../../domain/models';
import { colors } from '../../../../shared/theme/colors';

export function ChecklistSummaryRow({
  checklist,
  onPress,
  style,
}: {
  checklist: Checklist;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable style={[styles.rowBody, style]} onPress={onPress}>
      <Text style={styles.rowTitle}>{checklist.title}</Text>
      {checklist.items.length > 0 && (
        <Text style={styles.rowSubtitle}>
          {checklist.items.length} item
          {checklist.items.length === 1 ? '' : 's'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
