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
import {
  analytics,
  analyticsConsentGate,
} from './src/shared/analytics/AnalyticsService';
import { AsyncStorageAnalyticsConsentStore } from './src/shared/analytics/analyticsConsentStore';
import {
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from './src/shared/analytics/useAnalyticsConsent';
import { APP_VERSION } from './src/shared/killSwitches/appVersion';
import {
  KillSwitchSource,
  RemoteConfigKillSwitchSource,
} from './src/shared/killSwitches/RemoteConfigKillSwitchSource';
import { AsyncStorageKillSwitchOverrideStore } from './src/shared/killSwitches/killSwitchOverrideStore';
import { KillSwitchProvider } from './src/shared/killSwitches/useKillSwitches';
import { AnalyticsConsentDialog } from './src/shared/ui/AnalyticsConsentDialog';
import { ThemeProvider, useTheme } from './src/shared/theme/useTheme';
import { I18nProvider } from '@checklister/i18n';

const checklistRepository = new AsyncStorageChecklistRepository();
const runRepository = new AsyncStorageRunRepository();
const analyticsConsentStore = new AsyncStorageAnalyticsConsentStore();
// Scenario builds read pushed values instead of Remote Config (CheL-147); the
// require() is folded away everywhere else. Release throttles real fetches to
// once an hour; debug builds fetch every time.
const killSwitchSource: KillSwitchSource = __SCENARIO_BUILD__
  ? require('./src/scenarios/ScenarioKillSwitchSource').scenarioKillSwitchSource
  : new RemoteConfigKillSwitchSource(__DEV__ ? 0 : 60 * 60 * 1000);
// Overrides exist in debug builds only; release never constructs the store.
const killSwitchOverrideStore = __DEV__
  ? new AsyncStorageKillSwitchOverrideStore()
  : undefined;
// Scenario builds only (CheL-147); folded away, require() included, everywhere else.
if (__SCENARIO_BUILD__) {
  require('./src/scenarios/scenarioBuildMarker');
}
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function AppContent() {
  const { scheme, colors } = useTheme();
  const consent = useAnalyticsConsent();
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
      <AnalyticsConsentDialog
        visible={consent.status === 'unknown'}
        onAllow={consent.allow}
        onDeny={consent.deny}
      />
    </GestureHandlerRootView>
  );
}

function App() {
  return (
    <AnalyticsConsentProvider
      store={analyticsConsentStore}
      gate={analyticsConsentGate}
    >
      <ThemeProvider>
        <I18nProvider
          onLanguageResolved={(event, properties) =>
            analytics.logEvent(event, properties)
          }
        >
          <KillSwitchProvider
            source={killSwitchSource}
            overrideStore={killSwitchOverrideStore}
            appVersion={APP_VERSION}
          >
            <AppContent />
          </KillSwitchProvider>
        </I18nProvider>
      </ThemeProvider>
    </AnalyticsConsentProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
