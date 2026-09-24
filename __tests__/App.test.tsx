/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { analytics } from '../src/shared/analytics/AnalyticsService';
import { resetLanguageAnalyticsForTesting } from '../src/shared/i18n/useLanguageAnalytics';

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
