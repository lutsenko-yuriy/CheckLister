import {
  buildExternalSelectCallbackUrl,
  parseExternalSelectRequest,
} from './externalSelectLinks';

describe('parseExternalSelectRequest', () => {
  it('parses a percent-encoded custom-scheme callback', () => {
    const callbackUrl = encodeURIComponent('caller-app://select-result');

    expect(
      parseExternalSelectRequest(
        `checklister://select?callbackUrl=${callbackUrl}`,
      ),
    ).toEqual({ callbackUrl: 'caller-app://select-result' });
  });

  it('accepts an HTTPS universal-link callback', () => {
    const callbackUrl = encodeURIComponent(
      'https://caller.example/select-result',
    );

    expect(
      parseExternalSelectRequest(
        `checklister://select?callbackUrl=${callbackUrl}`,
      ),
    ).toEqual({ callbackUrl: 'https://caller.example/select-result' });
  });

  it.each(['checklister://select/'])(
    'accepts a trailing-slash host: %s',
    urlPrefix => {
      const callbackUrl = encodeURIComponent('caller-app://select-result');

      expect(
        parseExternalSelectRequest(`${urlPrefix}?callbackUrl=${callbackUrl}`),
      ).toEqual({ callbackUrl: 'caller-app://select-result' });
    },
  );

  it.each([
    'https://example.com/select?callbackUrl=caller%3A%2F%2Fresult',
    'checklister://other?callbackUrl=caller%3A%2F%2Fresult',
    'checklister://run?callbackUrl=caller%3A%2F%2Fresult',
    'checklister://select',
    'checklister://select?callbackUrl=',
    'checklister://select/extra-path?callbackUrl=caller%3A%2F%2Fresult',
    'not a url',
  ])('rejects an invalid external-select request: %s', url => {
    expect(parseExternalSelectRequest(url)).toBeNull();
  });

  it.each([
    'not-a-url',
    'checklister://select-result',
    ['java', 'script:alert(1)'].join(''),
    'data:text/plain,result',
    'http://caller.example/select-result',
    'checklister://select',
  ])('rejects an unsupported callback URL: %s', callbackUrl => {
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    expect(
      parseExternalSelectRequest(
        `checklister://select?callbackUrl=${encodedCallbackUrl}`,
      ),
    ).toBeNull();
  });

  it('rejects a self-referencing checklister: callback', () => {
    const callbackUrl = encodeURIComponent('checklister://run');

    expect(
      parseExternalSelectRequest(
        `checklister://select?callbackUrl=${callbackUrl}`,
      ),
    ).toBeNull();
  });
});

describe('buildExternalSelectCallbackUrl', () => {
  it('sets checklistId and checklistName with proper encoding for a selected result', () => {
    const callbackUrl = buildExternalSelectCallbackUrl(
      'caller-app://select-result?source=widget',
      {
        status: 'selected',
        checklistId: 'groceries/weekly',
        checklistName: 'Groceries & Household',
      },
    );

    expect(callbackUrl).toBe(
      'caller-app://select-result?source=widget&status=selected&checklistId=groceries%2Fweekly&checklistName=Groceries+%26+Household',
    );
  });

  it.each(['cancelled', 'error'] as const)(
    'deletes checklistId and checklistName for a %s result',
    status => {
      const callbackUrl = buildExternalSelectCallbackUrl(
        'caller-app://select-result?checklistId=stale&checklistName=stale&runId=stale',
        { status },
      );

      expect(callbackUrl).toBe(
        `caller-app://select-result?runId=stale&status=${status}`,
      );
    },
  );

  it('preserves the hash fragment', () => {
    const callbackUrl = buildExternalSelectCallbackUrl(
      'caller-app://select-result#section',
      { status: 'cancelled' },
    );

    expect(callbackUrl).toBe(
      'caller-app://select-result?status=cancelled#section',
    );
  });
});
