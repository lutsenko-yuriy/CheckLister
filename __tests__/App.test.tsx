/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '@react-native-firebase/analytics';
import {
  analytics,
  analyticsConsentGate,
} from '../src/shared/analytics/AnalyticsService';
import { resetLanguageAnalyticsForTesting } from '@checklister/i18n';

// Without it SafeAreaProvider renders no children, so no screen ever mounts.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('mounts I18nProvider, which resolves the language once at launch', async () => {
  resetLanguageAnalyticsForTesting();
  const spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });

  const languageEvents = spy.mock.calls.filter(
    ([name]) => name === 'app_language_resolved',
  );
  expect(languageEvents).toEqual([
    [
      'app_language_resolved',
      { app_language: 'en', requested_language: 'en', region: 'US' },
    ],
  ]);
  spy.mockRestore();
});

describe('analytics consent at launch', () => {
  const firebaseLogEvent = jest.mocked(logEvent);

  async function launch(stored?: string) {
    await AsyncStorage.clear();
    if (stored !== undefined) {
      await AsyncStorage.setItem(
        'analyticsConsent',
        JSON.stringify({ choice: stored, decidedAt: '2026-11-04T10:00:00Z' }),
      );
    }
    resetLanguageAnalyticsForTesting();
    firebaseLogEvent.mockClear();
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<App />);
    });
    return firebaseLogEvent.mock.calls.map(([, name]) => name);
  }

  afterEach(() => {
    analyticsConsentGate.setConsent('unknown');
  });

  it('forwards nothing to Firebase when no choice is stored', async () => {
    expect(await launch()).toEqual([]);
  });

  it('forwards nothing to Firebase when the stored choice is denied', async () => {
    expect(await launch('denied')).toEqual([]);
  });

  it('forwards the launch events when the stored choice is granted', async () => {
    expect(await launch('granted')).toEqual(
      expect.arrayContaining(['app_language_resolved']),
    );
  });

  describe('consent dialog', () => {
    async function open(stored?: 'granted' | 'denied') {
      await AsyncStorage.clear();
      if (stored) {
        await AsyncStorage.setItem(
          'analyticsConsent',
          JSON.stringify({ choice: stored, decidedAt: '2026-11-04T10:00:00Z' }),
        );
      }
      resetLanguageAnalyticsForTesting();
      firebaseLogEvent.mockClear();
      await render(<App />);
    }
    const sentToFirebase = () =>
      firebaseLogEvent.mock.calls.map(([, name]) => name);

    it('asks when no choice is stored', async () => {
      await open();
      expect(
        await screen.findByTestId('analytics-consent-dialog'),
      ).toBeTruthy();
      expect(sentToFirebase()).toEqual([]);
    });

    it('Allow closes the dialog and forwards the consent event', async () => {
      await open();
      await fireEvent.press(
        await screen.findByTestId('analytics-consent-allow'),
      );
      expect(screen.queryByTestId('analytics-consent-dialog')).toBeNull();
      expect(sentToFirebase()).toEqual(['analytics_consent_granted']);
    });

    it("Don't allow closes the dialog and forwards nothing", async () => {
      await open();
      await fireEvent.press(
        await screen.findByTestId('analytics-consent-deny'),
      );
      expect(screen.queryByTestId('analytics-consent-dialog')).toBeNull();
      expect(sentToFirebase()).toEqual([]);
    });

    it('does not ask when the stored choice is granted', async () => {
      await open('granted');
      expect(screen.queryByTestId('analytics-consent-dialog')).toBeNull();
      expect(sentToFirebase()).toEqual(
        expect.arrayContaining(['app_language_resolved']),
      );
    });

    it('does not ask when the stored choice is denied', async () => {
      await open('denied');
      expect(screen.queryByTestId('analytics-consent-dialog')).toBeNull();
      expect(sentToFirebase()).toEqual([]);
    });
  });

  describe('settings (CheL-127)', () => {
    it('opens from the gear, and switching on forwards events and is remembered', async () => {
      await AsyncStorage.clear();
      await AsyncStorage.setItem(
        'analyticsConsent',
        JSON.stringify({ choice: 'denied', decidedAt: '2026-11-04T10:00:00Z' }),
      );
      resetLanguageAnalyticsForTesting();
      firebaseLogEvent.mockClear();
      await render(<App />);

      await fireEvent.press(await screen.findByLabelText('Open settings'));
      const toggle = await screen.findByTestId('analytics-consent-switch');
      expect(toggle.props.value).toBe(false);
      await fireEvent(toggle, 'valueChange', true);

      await waitFor(() =>
        expect(firebaseLogEvent.mock.calls.map(([, name]) => name)).toContain(
          'analytics_consent_granted',
        ),
      );
      expect(
        JSON.parse((await AsyncStorage.getItem('analyticsConsent')) ?? '{}')
          .choice,
      ).toBe('granted');
    });
  });
});
