import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { getCountry, getLocales } from 'react-native-localize';
import { Checklist } from '../features/checklists/domain/models';
import { startRun } from '../features/runs/domain/models';
import { deliverExternalRunResult } from '../features/runs/externalRunCallbackDelivery';
import { deliverExternalSelectResult } from '../features/checklists/externalSelectCallbackDelivery';
import { I18nProvider } from '../shared/i18n/useI18n';
import { translate } from '../shared/i18n/translate';
import type { AppLanguage } from '../shared/i18n/languages';
import { ExternalLinkCoordinator } from './ExternalLinkCoordinator';
import { RootStackParamList } from './types';

const mockUseChecklists = jest.fn();
const mockUseRuns = jest.fn();
const mockUseExternalSelection = jest.fn();

jest.mock('../features/checklists/useChecklists', () => ({
  useChecklists: () => mockUseChecklists(),
}));

jest.mock('../features/checklists/useExternalSelection', () => ({
  useExternalSelection: () => mockUseExternalSelection(),
}));

jest.mock('../features/runs/useRuns', () => ({
  useRuns: () => mockUseRuns(),
}));

jest.mock('./externalLinkNativeHandoff', () => ({
  activateExternalLinkHandoff: jest.fn().mockResolvedValue([]),
  deactivateExternalLinkHandoff: jest.fn(),
}));

const groceries: Checklist = {
  id: 'groceries-id',
  title: 'Groceries',
  items: [{ id: 'milk-id', text: 'Milk' }],
};

function runUrl(
  checklistId: string,
  callbackUrl = 'caller-app://run-result',
): string {
  return `checklister://run?checklistId=${encodeURIComponent(
    checklistId,
  )}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function selectUrl(callbackUrl = 'caller-app://select-result'): string {
  return `checklister://select?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function mockOS(languageTag: string) {
  const [languageCode, countryCode = ''] = languageTag.split('-');
  jest
    .mocked(getLocales)
    .mockReturnValue([
      { languageTag, languageCode, countryCode, isRTL: false },
    ]);
  jest.mocked(getCountry).mockReturnValue(countryCode || 'US');
}

describe('ExternalLinkCoordinator localization (#80)', () => {
  let activeRun: ReturnType<typeof startRun> | null;
  let navigationRef: ReturnType<
    typeof createNavigationContainerRef<RootStackParamList>
  >;
  let pendingCallbackUrl: string | null;
  let currentUnmount: (() => void) | null = null;

  async function renderCoordinator() {
    const utils = await render(
      <I18nProvider>
        <ExternalLinkCoordinator
          navigationReady
          navigationRef={navigationRef}
        />
      </I18nProvider>,
    );
    currentUnmount = utils.unmount;
    return utils;
  }

  beforeEach(() => {
    mockOS('en-US');
    activeRun = null;
    navigationRef = createNavigationContainerRef<RootStackParamList>();
    jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'goBack').mockImplementation(() => {});

    mockUseChecklists.mockImplementation(() => ({
      checklists: [groceries],
      loading: false,
    }));
    mockUseRuns.mockImplementation(() => ({
      activeRun,
      startExternalRun: jest.fn(),
    }));
    pendingCallbackUrl = null;
    mockUseExternalSelection.mockImplementation(() => ({
      beginSelection: jest.fn(url => {
        pendingCallbackUrl = url;
      }),
      takePendingCallbackUrl: jest.fn(() => {
        const url = pendingCallbackUrl;
        pendingCallbackUrl = null;
        return url;
      }),
    }));

    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_eventType, listener) => ({
        remove: jest.fn(),
        _emit: listener,
      })) as unknown as jest.SpyInstance;
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    currentUnmount?.();
    currentUnmount = null;
    jest.restoreAllMocks();
  });

  function emitUrl(url: string) {
    const calls = jest.mocked(Linking.addEventListener).mock.calls;
    const listener = calls[calls.length - 1][1];
    listener({ url });
  }

  it('shows the invalid-callback alert in Russian', async () => {
    mockOS('ru-RU');
    await renderCoordinator();
    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());

    await act(async () => emitUrl(selectUrl('tel:+4912345')));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Мы не знаем, в какое приложение вернуться.',
      ),
    );
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('shows the callback delivery failure message in German', async () => {
    mockOS('de-DE');
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('No receiving app'));
    await renderCoordinator();
    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());

    await act(async () => emitUrl(runUrl('missing-id')));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Das Ergebnis konnte nicht an die aufrufende App übermittelt werden.',
      ),
    );
  });

  it('returns identical callback URLs regardless of UI language', async () => {
    // The callback URL contract (status/checklistId/runId/name) is built by
    // the same delivery helpers ExternalLinkCoordinator and RunScreen /
    // ChecklistSelectScreen call — only the translated failure message
    // varies by language, and it never reaches a successful callback URL.
    const languages: AppLanguage[] = ['en', 'de', 'fr', 'ru'];
    const runUrls: string[] = [];
    const selectUrls: string[] = [];

    for (const language of languages) {
      const openURL = jest
        .spyOn(Linking, 'openURL')
        .mockClear()
        .mockResolvedValue(undefined);
      await deliverExternalRunResult(
        'caller-app://run-result',
        {
          status: 'completed',
          checklistId: groceries.id,
          runId: 'fixed-run-id',
        },
        translate(language, 'errors.callbackDeliveryFailed'),
      );
      runUrls.push(String(openURL.mock.calls[0][0]));
      openURL.mockRestore();
    }

    for (const language of languages) {
      const openURL = jest
        .spyOn(Linking, 'openURL')
        .mockClear()
        .mockResolvedValue(undefined);
      await deliverExternalSelectResult(
        'caller-app://select-result',
        {
          status: 'selected',
          checklistId: groceries.id,
          checklistName: groceries.title,
        },
        translate(language, 'errors.callbackDeliveryFailed'),
      );
      selectUrls.push(String(openURL.mock.calls[0][0]));
      openURL.mockRestore();
    }

    expect(new Set(runUrls).size).toBe(1);
    expect(new Set(selectUrls).size).toBe(1);
    expect(runUrls[0]).toContain(`checklistId=${groceries.id}`);
    expect(runUrls[0]).toContain('runId=fixed-run-id');
    expect(selectUrls[0]).toContain(
      `checklistName=${encodeURIComponent(groceries.title)}`,
    );
  });
});
