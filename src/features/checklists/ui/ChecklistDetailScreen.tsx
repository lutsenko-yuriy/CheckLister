import React, { useLayoutEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useChecklists } from '../useChecklists';

type Props = NativeStackScreenProps<RootStackParamList, 'ChecklistDetail'>;

export function ChecklistDetailScreen({ navigation, route }: Props) {
  const { checklists } = useChecklists();
  const checklist = checklists.find(c => c.id === route.params.checklistId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: checklist?.title ?? 'Checklist' });
  }, [navigation, checklist?.title]);

  if (!checklist) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyState}>Checklist not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{checklist.title}</Text>
      <Text style={styles.emptyState}>No items yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
});
