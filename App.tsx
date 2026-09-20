/**
 * @format
 */

import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { AsyncStorageChecklistRepository } from './src/features/checklists/data/asyncStorageChecklistRepository';
import { ChecklistsProvider } from './src/features/checklists/useChecklists';
import { ExternalSelectionProvider } from './src/features/checklists/useExternalSelection';
import { RunsProvider } from './src/features/runs/useRuns';
import { AsyncStorageRunRepository } from './src/features/runs/data/asyncStorageRunRepository';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ExternalRunLinkCoordinator } from './src/navigation/ExternalRunLinkCoordinator';
import { RootStackParamList } from './src/navigation/types';

const checklistRepository = new AsyncStorageChecklistRepository();
const runRepository = new AsyncStorageRunRepository();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [navigationReady, setNavigationReady] = useState(false);
  const handleNavigationReady = useCallback(() => {
    setNavigationReady(true);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ChecklistsProvider repository={checklistRepository}>
          <RunsProvider repository={runRepository}>
            <ExternalSelectionProvider>
              <NavigationContainer
                ref={navigationRef}
                onReady={handleNavigationReady}
              >
                <RootNavigator />
              </NavigationContainer>
              <ExternalRunLinkCoordinator
                navigationReady={navigationReady}
                navigationRef={navigationRef}
              />
            </ExternalSelectionProvider>
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
