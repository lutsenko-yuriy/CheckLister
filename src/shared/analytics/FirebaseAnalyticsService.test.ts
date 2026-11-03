import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setConsent,
} from '@react-native-firebase/analytics';
import { FirebaseAnalyticsService } from './FirebaseAnalyticsService';

const analyticsInstance = getAnalytics();

describe('FirebaseAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards events with their properties', () => {
    new FirebaseAnalyticsService().logEvent('item_added', {
      checklist_id: 'c1',
      item_count: 3,
    });

    expect(logEvent).toHaveBeenCalledWith(analyticsInstance, 'item_added', {
      checklist_id: 'c1',
      item_count: 3,
    });
  });

  it('sends booleans as strings and drops null values', () => {
    new FirebaseAnalyticsService().logEvent('run_item_toggled', {
      checked: true,
      other: false,
      missing: null,
      count: 0,
    });

    expect(logEvent).toHaveBeenCalledWith(
      analyticsInstance,
      'run_item_toggled',
      { checked: 'true', other: 'false', count: 0 },
    );
  });

  it('logs screen views as screen_view events', () => {
    new FirebaseAnalyticsService().logScreenView('screen_run_history', {
      scope: 'all',
      entry_count: 2,
    });

    expect(logEvent).toHaveBeenCalledWith(analyticsInstance, 'screen_view', {
      screen_name: 'screen_run_history',
      screen_class: 'screen_run_history',
      scope: 'all',
      entry_count: 2,
    });
  });

  it('enables collection and analytics storage, never ad storage', () => {
    new FirebaseAnalyticsService().setCollectionEnabled(true);

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      analyticsInstance,
      true,
    );
    expect(setConsent).toHaveBeenCalledWith(analyticsInstance, {
      analytics_storage: true,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });
  });

  it('disables collection and analytics storage', () => {
    new FirebaseAnalyticsService().setCollectionEnabled(false);

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      analyticsInstance,
      false,
    );
    expect(setConsent).toHaveBeenCalledWith(
      analyticsInstance,
      expect.objectContaining({ analytics_storage: false }),
    );
  });

  it('swallows a rejected native call', async () => {
    (logEvent as jest.Mock).mockRejectedValueOnce(new Error('native failure'));

    expect(() => new FirebaseAnalyticsService().logEvent('x')).not.toThrow();
    await Promise.resolve();
  });

  it('swallows a synchronous native error', () => {
    jest.mocked(getAnalytics).mockImplementationOnce(() => {
      throw new Error('not configured');
    });

    expect(() => new FirebaseAnalyticsService().logEvent('x')).not.toThrow();
  });
});
