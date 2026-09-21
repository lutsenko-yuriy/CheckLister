import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Checklist } from '../features/checklists/domain/models';
import { ChecklistRun, startRun } from '../features/runs/domain/models';
import { analytics } from '../shared/analytics/AnalyticsService';
import { ExternalLinkCoordinator } from './ExternalLinkCoordinator';
import { RootStackParamList } from './types';

const mockUseChecklists = jest.fn();
const mockUseRuns = jest.fn();
const mockUseExternalSelection = jest.fn();
const mockActivateExternalLinkHandoff = jest.fn();
const mockDeactivateExternalLinkHandoff = jest.fn();

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
  activateExternalLinkHandoff: () => mockActivateExternalLinkHandoff(),
  deactivateExternalLinkHandoff: () => mockDeactivateExternalLinkHandoff(),
}));

const groceries: Checklist = {
  id: 'groceries-id',
  title: 'Groceries',
  items: [{ id: 'milk-id', text: 'Milk' }],
};
const emptyChecklist: Checklist = {
  id: 'empty-id',
  title: 'Empty',
  items: [],
};

function runUrl(
  checklistId: string,
  callbackUrl = 'caller-app://run-result?source=widget',
): string {
  return `checklister://run?checklistId=${encodeURIComponent(
    checklistId,
  )}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function selectUrl(
  callbackUrl = 'caller-app://select-result?source=widget',
): string {
  return `checklister://select?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

describe('ExternalLinkCoordinator', () => {
  let activeRun: ChecklistRun | null;
  let checklists: Checklist[];
  let loading: boolean;
  let emitUrl: (url: string) => void;
  let listenerRemove: jest.Mock;
  let startExternalRun: jest.Mock;
  let beginSelection: jest.Mock;
  let takePendingCallbackUrl: jest.Mock;
  let pendingCallbackUrl: string | null;
  let navigationReady: boolean;
  let navigationRef: ReturnType<
    typeof createNavigationContainerRef<RootStackParamList>
  >;

  async function renderCoordinator() {
    return await render(
      <ExternalLinkCoordinator
        navigationReady={navigationReady}
        navigationRef={navigationRef}
      />,
    );
  }

  beforeEach(() => {
    mockActivateExternalLinkHandoff.mockClear();
    mockDeactivateExternalLinkHandoff.mockClear();
    activeRun = null;
    checklists = [groceries, emptyChecklist];
    loading = false;
    navigationReady = true;
    startExternalRun = jest.fn();
    pendingCallbackUrl = null;
    beginSelection = jest.fn(url => {
      pendingCallbackUrl = url;
    });
    takePendingCallbackUrl = jest.fn(() => {
      const url = pendingCallbackUrl;
      pendingCallbackUrl = null;
      return url;
    });
    navigationRef = createNavigationContainerRef<RootStackParamList>();
    jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'goBack').mockImplementation(() => {});

    mockUseChecklists.mockImplementation(() => ({ checklists, loading }));
    mockUseRuns.mockImplementation(() => ({
      activeRun,
      startExternalRun,
    }));
    mockUseExternalSelection.mockImplementation(() => ({
      beginSelection,
      takePendingCallbackUrl,
    }));

    listenerRemove = jest.fn();
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(runUrl(groceries.id));
    jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_eventType, listener) => {
        emitUrl = url => listener({ url });
        return { remove: listenerRemove };
      });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});
    mockActivateExternalLinkHandoff.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('waits for checklist hydration and navigation readiness before starting a cold-start request', async () => {
    loading = true;
    navigationReady = false;
    const { rerender } = await renderCoordinator();

    await waitFor(() => expect(Linking.getInitialURL).toHaveBeenCalled());
    expect(startExternalRun).not.toHaveBeenCalled();

    navigationReady = true;
    await rerender(
      <ExternalLinkCoordinator
        navigationReady={navigationReady}
        navigationRef={navigationRef}
      />,
    );
    expect(startExternalRun).not.toHaveBeenCalled();

    loading = false;
    await rerender(
      <ExternalLinkCoordinator
        navigationReady={navigationReady}
        navigationRef={navigationRef}
      />,
    );

    await waitFor(() =>
      expect(startExternalRun).toHaveBeenCalledWith(
        groceries,
        'caller-app://run-result?source=widget',
      ),
    );
    expect(navigationRef.navigate).toHaveBeenCalledWith('Run', {
      checklistId: groceries.id,
    });
  });

  it('handles foreground run links and reports when they replace an active run', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    activeRun = startRun(groceries);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () =>
      emitUrl(runUrl(groceries.id, 'second-app://result')),
    );

    await waitFor(() =>
      expect(startExternalRun).toHaveBeenCalledWith(
        groceries,
        'second-app://result',
      ),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_run_request_handled',
      { outcome: 'started', replaced_active_run: true },
    );
  });

  it('handles a URL received natively before the JavaScript listener is ready', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    mockActivateExternalLinkHandoff.mockResolvedValue([runUrl(groceries.id)]);

    await renderCoordinator();

    await waitFor(() =>
      expect(startExternalRun).toHaveBeenCalledWith(
        groceries,
        'caller-app://run-result?source=widget',
      ),
    );
    expect(Linking.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('processes the cold URL before URLs queued during native startup', async () => {
    let resolveInitialUrl: (url: string | null) => void = () => {};
    jest.spyOn(Linking, 'getInitialURL').mockReturnValue(
      new Promise(resolve => {
        resolveInitialUrl = resolve;
      }),
    );
    mockActivateExternalLinkHandoff.mockResolvedValue([
      runUrl(groceries.id, 'second-app://result'),
    ]);
    await renderCoordinator();

    await act(async () => resolveInitialUrl(runUrl(groceries.id)));

    await waitFor(() => expect(startExternalRun).toHaveBeenCalledTimes(2));
    expect(startExternalRun.mock.calls.map(call => call[1])).toEqual([
      'caller-app://run-result?source=widget',
      'second-app://result',
    ]);
  });

  it('processes a URL exposed by two startup channels only once', async () => {
    const url = runUrl(groceries.id);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(url);
    mockActivateExternalLinkHandoff.mockResolvedValue([url]);

    await renderCoordinator();

    await waitFor(() => expect(startExternalRun).toHaveBeenCalledTimes(1));
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing', 'missing-id'],
    ['empty', emptyChecklist.id],
  ])(
    'returns the same public error result for a %s checklist',
    async (_caseName, checklistId) => {
      jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
      await renderCoordinator();

      await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
      await act(async () => emitUrl(runUrl(checklistId)));

      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
      const callback = String(jest.mocked(Linking.openURL).mock.calls[0][0]);
      expect(callback).toContain('source=widget');
      expect(callback).toContain('status=error');
      expect(callback).toContain(`checklistId=${checklistId}`);
      expect(callback).not.toContain('runId=');
      expect(startExternalRun).not.toHaveBeenCalled();
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(analytics.logEvent).toHaveBeenCalledWith(
        'external_run_request_handled',
        { outcome: 'error', replaced_active_run: false },
      );
    },
  );

  it('rejects an invalid run callback without disturbing an active run', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    activeRun = startRun(groceries);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(runUrl(groceries.id, 'tel:+4912345')));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'We do not know which app to return to.',
      ),
    );
    expect(startExternalRun).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_run_request_handled',
      { outcome: 'invalid_callback', replaced_active_run: false },
    );
  });

  it('shows a dismiss-only message if an error callback cannot be delivered', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('No receiving app'));
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(runUrl('missing-id')));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could not return the result to the calling app.',
      ),
    );
    expect(startExternalRun).not.toHaveBeenCalled();
  });

  it('never includes request identifiers or callback data in run analytics', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(runUrl(groceries.id)));

    await waitFor(() => expect(analytics.logEvent).toHaveBeenCalled());
    const analyticsPayload = JSON.stringify(
      jest.mocked(analytics.logEvent).mock.calls,
    );
    expect(analyticsPayload).not.toContain(groceries.id);
    expect(analyticsPayload).not.toContain('caller-app');
    expect(analyticsPayload).not.toContain('source=widget');
  });

  it('contains an initial URL lookup failure and keeps listening for foreground links', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockRejectedValue(new Error('Native lookup failed'));
    await renderCoordinator();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to read the initial external-link URL',
      ),
    );
    await act(async () => emitUrl(runUrl(groceries.id)));

    await waitFor(() =>
      expect(startExternalRun).toHaveBeenCalledWith(
        groceries,
        'caller-app://run-result?source=widget',
      ),
    );
  });

  it('removes the foreground URL listener when unmounted', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    const { unmount } = await renderCoordinator();

    await unmount();

    expect(listenerRemove).toHaveBeenCalledTimes(1);
    expect(mockDeactivateExternalLinkHandoff).toHaveBeenCalledTimes(1);
  });

  it('opens the picker for a select request once checklists are hydrated', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(selectUrl()));

    await waitFor(() =>
      expect(beginSelection).toHaveBeenCalledWith(
        'caller-app://select-result?source=widget',
      ),
    );
    expect(navigationRef.navigate).toHaveBeenCalledWith('ChecklistSelect');
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_select_request_handled',
      { outcome: 'opened' },
    );
  });

  it('returns a public error and does not navigate when there are no checklists to select', async () => {
    checklists = [];
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(selectUrl()));

    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    const callback = String(jest.mocked(Linking.openURL).mock.calls[0][0]);
    expect(callback).toContain('status=error');
    expect(beginSelection).not.toHaveBeenCalled();
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_select_request_handled',
      { outcome: 'error' },
    );
  });

  it.each([
    ['missing', 'checklister://select'],
    ['unsupported scheme', selectUrl('tel:+4912345')],
    ['self-referencing', selectUrl('checklister://select?callbackUrl=x')],
  ])(
    'rejects a select request with a %s callback',
    async (_caseName, url) => {
      jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
      await renderCoordinator();

      await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
      await act(async () => emitUrl(url));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'We do not know which app to return to.',
        ),
      );
      expect(beginSelection).not.toHaveBeenCalled();
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(analytics.logEvent).toHaveBeenCalledWith(
        'external_select_request_handled',
        { outcome: 'invalid_callback' },
      );
    },
  );

  it('leaves an active run byte-identical and does not navigate away from it for a select request', async () => {
    activeRun = startRun(groceries);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(selectUrl()));

    await waitFor(() => expect(beginSelection).toHaveBeenCalled());
    expect(navigationRef.navigate).toHaveBeenCalledWith('ChecklistSelect');
    expect(navigationRef.navigate).not.toHaveBeenCalledWith(
      'Run',
      expect.anything(),
    );
    expect(startExternalRun).not.toHaveBeenCalled();
    expect(mockUseRuns().activeRun).toBe(activeRun);
  });

  it('cancels the first caller and re-points the picker for a second select request', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () =>
      emitUrl(selectUrl('first-app://result?source=widget')),
    );
    await waitFor(() =>
      expect(beginSelection).toHaveBeenCalledWith(
        'first-app://result?source=widget',
      ),
    );
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);

    await act(async () =>
      emitUrl(selectUrl('second-app://result?source=widget')),
    );

    await waitFor(() =>
      expect(beginSelection).toHaveBeenCalledWith(
        'second-app://result?source=widget',
      ),
    );
    const openUrlCallback = String(
      jest.mocked(Linking.openURL).mock.calls[0][0],
    );
    expect(openUrlCallback).toContain('first-app://result');
    expect(openUrlCallback).toContain('status=cancelled');
    // Re-pointing an already-open picker never pushes a second one.
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending selection and pops the picker before starting a run', async () => {
    pendingCallbackUrl = 'select-caller://result?source=widget';
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(runUrl(groceries.id)));

    await waitFor(() => expect(startExternalRun).toHaveBeenCalled());
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    const cancelledCallback = String(
      jest.mocked(Linking.openURL).mock.calls[0][0],
    );
    expect(cancelledCallback).toContain('select-caller://result');
    expect(cancelledCallback).toContain('status=cancelled');
    expect(navigationRef.goBack).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledWith('Run', {
      checklistId: groceries.id,
    });
  });

  it('never includes callback data or checklist identity in select analytics', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(selectUrl()));

    await waitFor(() =>
      expect(analytics.logEvent).toHaveBeenCalledWith(
        'external_select_request_handled',
        expect.anything(),
      ),
    );
    const analyticsPayload = JSON.stringify(
      jest.mocked(analytics.logEvent).mock.calls,
    );
    expect(analyticsPayload).not.toContain('caller-app');
    expect(analyticsPayload).not.toContain('source=widget');
    expect(analyticsPayload).not.toContain(groceries.id);
  });
});
