import React, { useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { createThemedStyles } from '../shared/theme/createThemedStyles';
import {
  AnalyticsRecord,
  RecordingAnalyticsService,
  recordingAnalyticsService,
} from './RecordingAnalyticsService';

function formatRecord({ name, properties }: AnalyticsRecord): string {
  const parts = Object.entries(properties).map(
    ([key, value]) => `${key}: ${value}`,
  );
  return parts.length > 0 ? `${name} (${parts.join(', ')})` : name;
}

// Scenario builds only, so English literals instead of t() (like the Debug screen).
export function ScenarioEventsScreen({
  recorder = recordingAnalyticsService,
}: {
  recorder?: RecordingAnalyticsService;
}) {
  const styles = useStyles();
  const records = useSyncExternalStore(
    listener => recorder.subscribe(listener),
    () => recorder.getRecords(),
  );

  return (
    <View style={styles.container} testID="scenario-events-screen">
      <Text style={styles.count}>{`${records.length} recorded`}</Text>
      <ScrollView>
        {records.map((record, index) => (
          <Text key={index} style={styles.row}>
            {formatRecord(record)}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  row: {
    paddingVertical: 4,
    fontSize: 14,
    color: colors.text,
  },
}));
