import { Alert, Linking } from 'react-native';
import { analytics } from '../../shared/analytics/AnalyticsService';
import { deliverExternalSelectResult } from './externalSelectCallbackDelivery';

const FAILURE_MESSAGE = 'Could not return the result to the calling app.';

jest.mock('../../shared/analytics/AnalyticsService', () => ({
  analytics: { logEvent: jest.fn(), logScreenView: jest.fn() },
}));

describe('deliverExternalSelectResult', () => {
  const callbackUrl = 'caller-app://select-result?source=widget';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('opens the built callback url and logs a delivered success event', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await deliverExternalSelectResult(
      callbackUrl,
      {
        status: 'selected',
        checklistId: 'groceries-id',
        checklistName: 'Groceries',
      },
      FAILURE_MESSAGE,
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('status=selected'),
    );
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_select_callback_finished',
      { status: 'selected', delivered: true },
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('logs a cancelled delivery without any checklist identifiers', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await deliverExternalSelectResult(
      callbackUrl,
      { status: 'cancelled' },
      FAILURE_MESSAGE,
    );

    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_select_callback_finished',
      { status: 'cancelled', delivered: true },
    );
  });

  it('alerts and logs a failed delivery when openURL rejects', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('nope'));

    await deliverExternalSelectResult(
      callbackUrl,
      { status: 'error' },
      FAILURE_MESSAGE,
    );

    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_select_callback_finished',
      { status: 'error', delivered: false },
    );
    expect(Alert.alert).toHaveBeenCalledWith(FAILURE_MESSAGE);
  });

  it('never includes the callback url, checklist id or checklist name in analytics payloads', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const checklistId = 'unique-checklist-id-123';
    const checklistName = 'Very Unique Checklist Name';
    const secretCallbackUrl = `caller-app://select-result?token=${checklistId}`;

    await deliverExternalSelectResult(
      secretCallbackUrl,
      {
        status: 'selected',
        checklistId,
        checklistName,
      },
      FAILURE_MESSAGE,
    );

    const loggedPayloads = (analytics.logEvent as jest.Mock).mock.calls.map(
      call => JSON.stringify(call[1]),
    );
    for (const payload of loggedPayloads) {
      expect(payload).not.toContain(checklistId);
      expect(payload).not.toContain(checklistName);
      expect(payload).not.toContain(secretCallbackUrl);
    }
  });
});
