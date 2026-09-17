/**
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AsyncStorageChecklistRepository } from './src/features/checklists/data/asyncStorageChecklistRepository';
import { ChecklistsProvider } from './src/features/checklists/useChecklists';
import { RootNavigator } from './src/navigation/RootNavigator';

const checklistRepository = new AsyncStorageChecklistRepository();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ChecklistsProvider repository={checklistRepository}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ChecklistsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
