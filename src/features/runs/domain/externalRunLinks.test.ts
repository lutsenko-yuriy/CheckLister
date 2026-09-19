import {
  buildExternalRunCallbackUrl,
  parseExternalRunRequest,
} from './externalRunLinks';

describe('parseExternalRunRequest', () => {
  it('parses a checklist id and percent-encoded custom-scheme callback', () => {
    const callbackUrl = encodeURIComponent(
      'caller-app://run-result?source=quick action',
    );

    expect(
      parseExternalRunRequest(
        `checklister://run?checklistId=groceries%2Fweekly&callbackUrl=${callbackUrl}`,
      ),
    ).toEqual({
      checklistId: 'groceries/weekly',
      callbackUrl: 'caller-app://run-result?source=quick action',
    });
  });

  it('accepts an HTTPS universal-link callback', () => {
    const callbackUrl = encodeURIComponent('https://caller.example/run-result');

    expect(
      parseExternalRunRequest(
        `checklister://run?checklistId=list-1&callbackUrl=${callbackUrl}`,
      ),
    ).toEqual({
      checklistId: 'list-1',
      callbackUrl: 'https://caller.example/run-result',
    });
  });

  it.each([
    'https://example.com/run?checklistId=list-1&callbackUrl=caller%3A%2F%2Fresult',
    'checklister://other?checklistId=list-1&callbackUrl=caller%3A%2F%2Fresult',
    'checklister://run?callbackUrl=caller%3A%2F%2Fresult',
    'checklister://run?checklistId=&callbackUrl=caller%3A%2F%2Fresult',
    'checklister://run?checklistId=list-1',
    'not a url',
  ])('rejects an invalid external-run request: %s', url => {
    expect(parseExternalRunRequest(url)).toBeNull();
  });

  const scriptCallbackUrl = ['java', 'script:alert(1)'].join('');

  it.each([
    'not-a-url',
    'checklister://run-result',
    scriptCallbackUrl,
    'data:text/plain,result',
    'file:///tmp/result',
    'http://caller.example/run-result',
  ])('rejects an unsupported callback URL: %s', callbackUrl => {
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    expect(
      parseExternalRunRequest(
        `checklister://run?checklistId=list-1&callbackUrl=${encodedCallbackUrl}`,
      ),
    ).toBeNull();
  });
});

describe('buildExternalRunCallbackUrl', () => {
  it('preserves caller parameters while replacing reserved completed values', () => {
    const callbackUrl = buildExternalRunCallbackUrl(
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

  it.each(['cancelled', 'error'] as const)(
    'omits runId for a %s result',
    status => {
      const callbackUrl = buildExternalRunCallbackUrl(
        'caller-app://run-result?runId=stale',
        { status, checklistId: 'list-1' },
      );

      expect(callbackUrl).toBe(
        `caller-app://run-result?status=${status}&checklistId=list-1`,
      );
    },
  );
});
