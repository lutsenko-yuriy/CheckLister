import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.primary,
  size = 22,
  style,
  testID,
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={style}
      testID={testID}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}
