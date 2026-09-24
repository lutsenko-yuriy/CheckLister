import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { getCountry, getLocales } from 'react-native-localize';
import { analytics } from '../analytics/AnalyticsService';
import { formatDateTime } from './translate';
import { I18nProvider, useI18n } from './useI18n';
import { resetLanguageAnalyticsForTesting } from './useLanguageAnalytics';

const ISO = '2026-09-24T12:05:00.000Z';

function mockOS(languageTags: string[], country: string) {
  jest.mocked(getLocales).mockImplementation(() =>
    languageTags.map(languageTag => {
      const [languageCode, countryCode = ''] = languageTag.split('-');
      return { languageTag, languageCode, countryCode, isRTL: false };
    }),
  );
  jest.mocked(getCountry).mockImplementation(() => country);
}

function latestAppStateHandler(): (state: AppStateStatus) => void {
  const calls = jest.mocked(AppState.addEventListener).mock.calls;
  const [type, handler] = calls[calls.length - 1];
  expect(type).toBe('change');
  return handler;
}

const renders: string[] = [];

function Probe() {
  const { language, t, formatDateTime: format } = useI18n();
  const line = `${language}|${t('common.itemCount', { count: 2 })}|${format(
    ISO,
  )}`;
  renders.push(line);
  return <Text>{line}</Text>;
}

async function renderProvider(language?: 'en' | 'de' | 'fr' | 'ru') {
  return render(
    <I18nProvider language={language}>
      <Probe />
    </I18nProvider>,
  );
}

describe('I18nProvider / useI18n', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    renders.length = 0;
    resetLanguageAnalyticsForTesting();
    jest.mocked(AppState.addEventListener).mockClear();
    logSpy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});
    mockOS(['en-US'], 'US');
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('resolves from the OS synchronously, so the very first render is already correct', async () => {
    mockOS(['de-AT', 'en-GB'], 'AT');

    await renderProvider();

    // Only English is supported until WU3, but the region already applies.
    expect(renders[0]).toBe(`en|2 items|${formatDateTime('en', 'AT', ISO)}`);
    expect(logSpy).toHaveBeenCalledWith('app_language_resolved', {
      app_language: 'en',
      requested_language: 'de',
      region: 'AT',
    });
  });

  it('re-resolves when the app returns to the foreground', async () => {
    await renderProvider();
    mockOS(['en-GB'], 'GB');

    await act(async () => latestAppStateHandler()('active'));

    expect(
      screen.getByText(`en|2 items|${formatDateTime('en', 'GB', ISO)}`),
    ).toBeTruthy();
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenLastCalledWith('app_language_resolved', {
      app_language: 'en',
      requested_language: 'en',
      region: 'GB',
    });
  });

  it.each<AppStateStatus>(['background', 'inactive'])(
    'ignores the %s transition',
    async state => {
      await renderProvider();
      mockOS(['en-GB'], 'GB');

      await act(async () => latestAppStateHandler()(state));

      expect(renders).toHaveLength(1);
      expect(logSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('does not re-render consumers when a foreground transition resolves the same language', async () => {
    await renderProvider();

    await act(async () => latestAppStateHandler()('active'));
    await act(async () => latestAppStateHandler()('active'));

    expect(renders).toHaveLength(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('stops listening to AppState on unmount', async () => {
    const remove = jest.fn();
    jest
      .mocked(AppState.addEventListener)
      .mockImplementationOnce(() => ({ remove }));

    const { unmount } = await renderProvider();
    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('accepts a test-only language override', async () => {
    await renderProvider('ru');

    expect(renders[0]).toMatch(/^ru\|/);
  });

  it('falls back to English with no provider mounted', async () => {
    const { result } = await renderHook(() => useI18n());

    expect(result.current.language).toBe('en');
    expect(result.current.t('common.itemCount', { count: 1 })).toBe('1 item');
    expect(result.current.formatDateTime(ISO)).toBe(
      formatDateTime('en', undefined, ISO),
    );
    expect(logSpy).not.toHaveBeenCalled();
  });
});
