import { NoopAnalyticsService } from './AnalyticsService';

describe('NoopAnalyticsService', () => {
  it('does nothing on logEvent', () => {
    expect(() =>
      new NoopAnalyticsService().logEvent('any_event', { foo: 'bar' }),
    ).not.toThrow();
  });

  it('does nothing on logScreenView', () => {
    expect(() =>
      new NoopAnalyticsService().logScreenView('AnyScreen'),
    ).not.toThrow();
  });
});
