import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useKillSwitchDebug } from '../../../shared/killSwitches/useKillSwitches';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { useTheme } from '../../../shared/theme/useTheme';

// Debug builds only, so English literals instead of t() (see ARCHITECTURE.md).
const SOURCE_CAPTION = {
  override: 'override',
  remote: 'remote',
  default: 'default',
  ignored: 'ignored: min version',
} as const;

export function DebugScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { switches, setOverride, resetOverride, resetAll } =
    useKillSwitchDebug();

  return (
    <View style={styles.container} testID="debug-screen">
      {switches.map(item => (
        <View key={item.id} style={styles.row}>
          <View style={styles.labels}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.caption}>{SOURCE_CAPTION[item.source]}</Text>
          </View>
          {item.override !== null && (
            <Pressable
              onPress={() => resetOverride(item.id)}
              accessibilityRole="button"
              testID={`reset-${item.id}`}
              style={styles.reset}
            >
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          )}
          <Switch
            testID={`kill-switch-${item.id}`}
            accessibilityLabel={item.label}
            value={item.enabled}
            onValueChange={on => setOverride(item.id, on)}
            trackColor={{ true: colors.primary }}
          />
        </View>
      ))}
      <Pressable
        onPress={resetAll}
        accessibilityRole="button"
        style={styles.resetAll}
      >
        <Text style={styles.resetText}>Reset all overrides</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  labels: { flex: 1, marginRight: 12 },
  label: { fontSize: 16, color: colors.text },
  caption: { fontSize: 12, color: colors.textMuted },
  reset: { marginRight: 12, padding: 8 },
  resetAll: { alignSelf: 'center', marginTop: 16, padding: 12 },
  resetText: { fontSize: 14, color: colors.primary },
}));
