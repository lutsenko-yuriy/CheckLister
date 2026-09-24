/**
 * @format
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { AsyncStorageChecklistRepository } from './src/features/checklists/data/asyncStorageChecklistRepository';
import { ChecklistsProvider } from './src/features/checklists/useChecklists';
import { ExternalSelectionProvider } from './src/features/checklists/useExternalSelection';
import { RunsProvider } from './src/features/runs/useRuns';
import { AsyncStorageRunRepository } from './src/features/runs/data/asyncStorageRunRepository';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ExternalLinkCoordinator } from './src/navigation/ExternalLinkCoordinator';
import { RootStackParamList } from './src/navigation/types';
import { I18nProvider } from './src/shared/i18n/useI18n';
import { ThemeProvider, useTheme } from './src/shared/theme/useTheme';

const checklistRepository = new AsyncStorageChecklistRepository();
const runRepository = new AsyncStorageRunRepository();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function AppContent() {
  const { scheme, colors } = useTheme();
  const [navigationReady, setNavigationReady] = useState(false);
  const handleNavigationReady = useCallback(() => {
    setNavigationReady(true);
  }, []);

  // Without an explicit theme, NavigationContainer's own card background
  // stays React Navigation's default white and flashes on every push in
  // dark mode, regardless of what each screen renders.
  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.headerBackground,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [scheme, colors]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        />
        <ChecklistsProvider repository={checklistRepository}>
          <RunsProvider repository={runRepository}>
            <ExternalSelectionProvider>
              <NavigationContainer
                ref={navigationRef}
                onReady={handleNavigationReady}
                theme={navigationTheme}
              >
                <RootNavigator />
              </NavigationContainer>
              <ExternalLinkCoordinator
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

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
