import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/useTheme';

// Apple HIG / Material Design both recommend a minimum 44x44pt (48x48dp)
// touch target — a 22px icon with hitSlop alone falls short of that.
const MIN_TOUCH_TARGET = 44;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  style,
  testID,
  disabled = false,
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.touchTarget, disabled && styles.disabled, style]}
      testID={testID}
    >
      <Icon name={icon} size={size} color={resolvedColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
