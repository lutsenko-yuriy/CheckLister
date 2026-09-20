import {
  applyCallbackParams,
  isSupportedCallbackUrl,
  parseExternalLinkKind,
} from './externalLinkUrls';

describe('isSupportedCallbackUrl', () => {
  it('does not depend on runtime URL support for custom schemes', () => {
    const originalURL = globalThis.URL;
    globalThis.URL = class UnsupportedCustomSchemeURL {
      constructor() {
        throw new TypeError('Custom schemes are not supported');
      }
    } as unknown as typeof URL;

    try {
      expect(isSupportedCallbackUrl('caller-app://result')).toBe(true);
    } finally {
      globalThis.URL = originalURL;
    }
  });

  const scriptCallbackUrl = ['java', 'script:alert(1)'].join('');

  it.each([
    'not-a-url',
    'checklister://run-result',
    scriptCallbackUrl,
    'data:text/plain,result',
    'file:///tmp/result',
    'http://caller.example/run-result',
    'https://:443/run-result',
    'https://[::::]/run-result',
    'https://[1:2:3:4:5:6:7:8:9]/run-result',
    'tel:+49123456789',
    'mailto:user@example.com',
    'intent://run-result#Intent;scheme=caller-app;end',
    'caller-app:run-result',
    'caller-app://user@',
    'caller-app://host:bad',
  ])('rejects an unsupported callback URL: %s', callbackUrl => {
    expect(isSupportedCallbackUrl(callbackUrl)).toBe(false);
  });

  it('accepts a syntactically valid bracketed IPv6 callback host', () => {
    expect(isSupportedCallbackUrl('https://[2001:db8::1]/result')).toBe(true);
  });

  it('accepts an HTTPS universal-link callback', () => {
    expect(isSupportedCallbackUrl('https://caller.example/run-result')).toBe(
      true,
    );
  });
});

describe('applyCallbackParams', () => {
  it('does not depend on runtime URL support for custom schemes', () => {
    const originalURL = globalThis.URL;
    globalThis.URL = class UnsupportedCustomSchemeURL {
      constructor() {
        throw new TypeError('Custom schemes are not supported');
      }
    } as unknown as typeof URL;

    try {
      expect(
        applyCallbackParams('caller-app://result', {
          status: 'error',
          checklistId: 'list-1',
        }),
      ).toBe('caller-app://result?status=error&checklistId=list-1');
    } finally {
      globalThis.URL = originalURL;
    }
  });

  it('preserves caller parameters while setting new values', () => {
    const callbackUrl = applyCallbackParams(
      'caller-app://run-result?source=widget&status=old&checklistId=old&runId=old',
      {
        status: 'completed',
        checklistId: 'groceries/weekly',
        runId: 'run 42',
      },
    );

    expect(callbackUrl).toBe(
      'caller-app://run-result?source=widget&status=completed&checklistId=groceries%2Fweekly&runId=run+42',
    );
  });

  it('deletes params whose value is undefined', () => {
    const callbackUrl = applyCallbackParams(
      'caller-app://run-result?runId=stale',
      { status: 'cancelled', runId: undefined },
    );

    expect(callbackUrl).toBe('caller-app://run-result?status=cancelled');
  });

  it('preserves the hash fragment', () => {
    const callbackUrl = applyCallbackParams(
      'caller-app://run-result?a=1#section',
      { status: 'completed' },
    );

    expect(callbackUrl).toBe(
      'caller-app://run-result?a=1&status=completed#section',
    );
  });

  it('throws for an invalid callback URL', () => {
    expect(() => applyCallbackParams('not-a-url', { status: 'error' })).toThrow(
      TypeError,
    );
  });
});

describe('parseExternalLinkKind', () => {
  it.each([
    ['checklister://run', 'run'],
    ['checklister://run/', 'run'],
    ['checklister://run?checklistId=list-1', 'run'],
    ['checklister://select', 'select'],
    ['checklister://select/', 'select'],
    ['checklister://select?callbackUrl=caller%3A%2F%2Fresult', 'select'],
  ] as const)('classifies %s as %s', (url, kind) => {
    expect(parseExternalLinkKind(url)).toBe(kind);
  });

  it.each([
    'checklister://bogus',
    'checklister://run/extra-path',
    'checklister://select/extra-path',
    'https://example.com/run',
    'not a url',
  ])('returns null for an unrecognised link: %s', url => {
    expect(parseExternalLinkKind(url)).toBeNull();
  });
});
