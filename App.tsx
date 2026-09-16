/**
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AsyncStorageChecklistRepository } from './src/features/checklists/data/asyncStorageChecklistRepository';
import { ChecklistsProvider } from './src/features/checklists/useChecklists';
import { RootNavigator } from './src/navigation/RootNavigator';

const checklistRepository = new AsyncStorageChecklistRepository();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ChecklistsProvider repository={checklistRepository}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ChecklistsProvider>
    </SafeAreaProvider>
  );
}

export default App;
