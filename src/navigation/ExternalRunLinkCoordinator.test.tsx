import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Checklist } from '../features/checklists/domain/models';
import { ChecklistRun, startRun } from '../features/runs/domain/models';
import { analytics } from '../shared/analytics/AnalyticsService';
import { ExternalRunLinkCoordinator } from './ExternalRunLinkCoordinator';
import { RootStackParamList } from './types';

const mockUseChecklists = jest.fn();
const mockUseRuns = jest.fn();

jest.mock('../features/checklists/useChecklists', () => ({
  useChecklists: () => mockUseChecklists(),
}));

jest.mock('../features/runs/useRuns', () => ({
  useRuns: () => mockUseRuns(),
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

function requestUrl(
  checklistId: string,
  callbackUrl = 'caller-app://run-result?source=widget',
): string {
  return `checklister://run?checklistId=${encodeURIComponent(
    checklistId,
  )}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

describe('ExternalRunLinkCoordinator', () => {
  let activeRun: ChecklistRun | null;
  let checklists: Checklist[];
  let loading: boolean;
  let emitUrl: (url: string) => void;
  let listenerRemove: jest.Mock;
  let startExternalRun: jest.Mock;
  let navigationReady: boolean;
  let navigationRef: ReturnType<
    typeof createNavigationContainerRef<RootStackParamList>
  >;

  async function renderCoordinator() {
    return await render(
      <ExternalRunLinkCoordinator
        navigationReady={navigationReady}
        navigationRef={navigationRef}
      />,
    );
  }

  beforeEach(() => {
    activeRun = null;
    checklists = [groceries, emptyChecklist];
    loading = false;
    navigationReady = true;
    startExternalRun = jest.fn();
    navigationRef = createNavigationContainerRef<RootStackParamList>();
    jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});

    mockUseChecklists.mockImplementation(() => ({ checklists, loading }));
    mockUseRuns.mockImplementation(() => ({
      activeRun,
      startExternalRun,
    }));

    listenerRemove = jest.fn();
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(requestUrl(groceries.id));
    jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_eventType, listener) => {
        emitUrl = url => listener({ url });
        return { remove: listenerRemove };
      });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});
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
      <ExternalRunLinkCoordinator
        navigationReady={navigationReady}
        navigationRef={navigationRef}
      />,
    );
    expect(startExternalRun).not.toHaveBeenCalled();

    loading = false;
    await rerender(
      <ExternalRunLinkCoordinator
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

  it('handles foreground links and reports when they replace an active run', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    activeRun = startRun(groceries);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () =>
      emitUrl(requestUrl(groceries.id, 'second-app://result')),
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

  it.each([
    ['missing', 'missing-id'],
    ['empty', emptyChecklist.id],
  ])(
    'returns the same public error result for a %s checklist',
    async (_caseName, checklistId) => {
      jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
      await renderCoordinator();

      await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
      await act(async () => emitUrl(requestUrl(checklistId)));

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

  it('rejects an invalid callback without disturbing an active run', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    activeRun = startRun(groceries);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(requestUrl(groceries.id, 'tel:+4912345')));

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
    await act(async () => emitUrl(requestUrl('missing-id')));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could not return the result to the calling app.',
      ),
    );
    expect(startExternalRun).not.toHaveBeenCalled();
  });

  it('never includes request identifiers or callback data in analytics', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    await renderCoordinator();

    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    await act(async () => emitUrl(requestUrl(groceries.id)));

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
        'Failed to read the initial external-run URL',
      ),
    );
    await act(async () => emitUrl(requestUrl(groceries.id)));

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
  });
});
