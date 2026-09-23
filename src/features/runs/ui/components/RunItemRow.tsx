import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RunItem } from '../../domain/models';
import { useTheme } from '../../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';

export const RUN_ITEM_ROW_HEIGHT = 56;

export function RunItemRow({
  item,
  onToggle,
}: {
  item: RunItem;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      style={styles.row}
    >
      <Icon
        name={item.checked ? 'check-box' : 'check-box-outline-blank'}
        size={22}
        color={item.checked ? colors.primary : colors.textMuted}
      />
      <View style={styles.textContainer}>
        <Text
          style={[styles.itemText, item.checked && styles.itemTextChecked]}
          numberOfLines={1}
        >
          {item.text}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles(colors => ({
  row: {
    height: RUN_ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemText: {
    fontSize: 16,
    color: colors.text,
  },
  itemTextChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
}));
