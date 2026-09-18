/**
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AsyncStorageChecklistRepository } from './src/features/checklists/data/asyncStorageChecklistRepository';
import { ChecklistsProvider } from './src/features/checklists/useChecklists';
import { RunsProvider } from './src/features/runs/useRuns';
import { AsyncStorageRunRepository } from './src/features/runs/data/asyncStorageRunRepository';
import { RootNavigator } from './src/navigation/RootNavigator';

const checklistRepository = new AsyncStorageChecklistRepository();
const runRepository = new AsyncStorageRunRepository();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ChecklistsProvider repository={checklistRepository}>
          <RunsProvider repository={runRepository}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </RunsProvider>
        </ChecklistsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
