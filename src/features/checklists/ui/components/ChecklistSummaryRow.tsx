import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { Checklist } from '../../domain/models';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';

export function ChecklistSummaryRow({
  checklist,
  onPress,
  style,
  testID,
}: {
  checklist: Checklist;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable style={[styles.rowBody, style]} onPress={onPress} testID={testID}>
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

const useStyles = createThemedStyles(colors => ({
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
}));
