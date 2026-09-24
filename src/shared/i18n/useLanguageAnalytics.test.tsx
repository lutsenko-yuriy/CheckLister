import { renderHook } from '@testing-library/react-native';
import { analytics } from '../analytics/AnalyticsService';
import type { LanguageResolution } from './resolveLanguage';
import {
  resetLanguageAnalyticsForTesting,
  useLanguageAnalytics,
} from './useLanguageAnalytics';

const ENGLISH_US: LanguageResolution = {
  appLanguage: 'en',
  requestedLanguage: 'en',
  region: 'US',
};

describe('useLanguageAnalytics', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    resetLanguageAnalyticsForTesting();
    spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  async function renderWith(resolution: LanguageResolution) {
    return renderHook(
      (props: { resolution: LanguageResolution }) =>
        useLanguageAnalytics(props.resolution),
      { initialProps: { resolution } },
    );
  }

  it('logs app_language_resolved once on cold start', async () => {
    await renderWith(ENGLISH_US);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('app_language_resolved', {
      app_language: 'en',
      requested_language: 'en',
      region: 'US',
    });
  });

  it('omits region from the payload when the OS reports none', async () => {
    await renderWith({ appLanguage: 'en', requestedLanguage: 'ja' });

    expect(spy).toHaveBeenCalledWith('app_language_resolved', {
      app_language: 'en',
      requested_language: 'ja',
    });
    const properties = spy.mock.calls[0][1];
    expect(Object.keys(properties)).not.toContain('region');
  });

  it('does not log again when an equal resolution is re-delivered (matrix row 4)', async () => {
    const { rerender } = await renderWith(ENGLISH_US);

    await rerender({ resolution: { ...ENGLISH_US } });
    await rerender({ resolution: { ...ENGLISH_US } });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logs once when only the requested language changes between unsupported languages (matrix row 5)', async () => {
    const { rerender } = await renderWith({
      appLanguage: 'en',
      requestedLanguage: 'ja',
      region: 'JP',
    });

    await rerender({
      resolution: { appLanguage: 'en', requestedLanguage: 'pt', region: 'JP' },
    });
    await rerender({
      resolution: { appLanguage: 'en', requestedLanguage: 'pt', region: 'JP' },
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('app_language_resolved', {
      app_language: 'en',
      requested_language: 'pt',
      region: 'JP',
    });
  });

  it('logs when the region alone changes', async () => {
    const { rerender } = await renderWith(ENGLISH_US);

    await rerender({ resolution: { ...ENGLISH_US, region: 'CA' } });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not re-log the same tuple after the React root remounts (matrix row 6)', async () => {
    const first = await renderWith(ENGLISH_US);
    await first.unmount();

    await renderWith({ ...ENGLISH_US });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logs after a remount that lands on a different tuple', async () => {
    const first = await renderWith(ENGLISH_US);
    await first.unmount();

    await renderWith({
      appLanguage: 'en',
      requestedLanguage: 'de',
      region: 'US',
    });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('absorbs two simultaneously mounted consumers (dev double mount, matrix row 9)', async () => {
    await renderWith(ENGLISH_US);
    await renderWith(ENGLISH_US);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
