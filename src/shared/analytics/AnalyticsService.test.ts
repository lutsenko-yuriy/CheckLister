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

  it('does nothing on logScreenView with properties', () => {
    expect(() =>
      new NoopAnalyticsService().logScreenView('AnyScreen', { foo: 'bar' }),
    ).not.toThrow();
  });
});
