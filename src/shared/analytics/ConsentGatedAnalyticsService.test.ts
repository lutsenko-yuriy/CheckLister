import { ConsentGatedAnalyticsService } from './ConsentGatedAnalyticsService';

function makeDelegate() {
  return {
    logEvent: jest.fn(),
    logScreenView: jest.fn(),
    setCollectionEnabled: jest.fn(),
  };
}

describe('ConsentGatedAnalyticsService', () => {
  it('drops events and screen views while consent is unknown', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);

    gate.logEvent('item_added', { item_count: 1 });
    gate.logScreenView('screen_run_history');

    expect(delegate.logEvent).not.toHaveBeenCalled();
    expect(delegate.logScreenView).not.toHaveBeenCalled();
  });

  it('drops events while consent is denied', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);
    gate.setConsent('denied');

    gate.logEvent('item_added');
    gate.logScreenView('screen_run_history');

    expect(delegate.logEvent).not.toHaveBeenCalled();
    expect(delegate.logScreenView).not.toHaveBeenCalled();
  });

  it('forwards events and screen views once consent is granted', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);
    gate.setConsent('granted');

    gate.logEvent('item_added', { item_count: 1 });
    gate.logScreenView('screen_run_history', { scope: 'all' });

    expect(delegate.logEvent).toHaveBeenCalledWith('item_added', {
      item_count: 1,
    });
    expect(delegate.logScreenView).toHaveBeenCalledWith('screen_run_history', {
      scope: 'all',
    });
  });

  it('never replays events dropped before consent', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);
    gate.logEvent('dropped_early');

    gate.setConsent('granted');

    expect(delegate.logEvent).not.toHaveBeenCalled();
  });

  it('stops forwarding when consent goes from granted to denied', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);
    gate.setConsent('granted');
    gate.setConsent('denied');

    gate.logEvent('item_added');

    expect(delegate.logEvent).not.toHaveBeenCalled();
  });

  it('switches the delegate collection flag only for granted', () => {
    const delegate = makeDelegate();
    const gate = new ConsentGatedAnalyticsService(delegate);

    gate.setConsent('granted');
    expect(delegate.setCollectionEnabled).toHaveBeenLastCalledWith(true);

    gate.setConsent('denied');
    expect(delegate.setCollectionEnabled).toHaveBeenLastCalledWith(false);

    gate.setConsent('unknown');
    expect(delegate.setCollectionEnabled).toHaveBeenLastCalledWith(false);
  });
});
