const EXTERNAL_RUN_SCHEME = 'checklister:';
const EXTERNAL_RUN_HOST = 'run';
const HTTPS_SCHEME = 'https:';
const SCRIPT_CALLBACK_SCHEME = ['java', 'script:'].join('');
const UNSAFE_CALLBACK_SCHEMES = new Set([
  'data:',
  'file:',
  'http:',
  SCRIPT_CALLBACK_SCHEME,
]);

export interface ExternalRunRequest {
  readonly checklistId: string;
  readonly callbackUrl: string;
}

export type ExternalRunResult =
  | {
      readonly status: 'completed';
      readonly checklistId: string;
      readonly runId: string;
    }
  | {
      readonly status: 'cancelled' | 'error';
      readonly checklistId: string;
    };

function parseUrl(value: string): URL | null {
  if (value.trim() !== value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isSupportedCallbackUrl(value: string): boolean {
  const callbackUrl = parseUrl(value);
  if (!callbackUrl) {
    return false;
  }

  if (
    callbackUrl.protocol === EXTERNAL_RUN_SCHEME ||
    UNSAFE_CALLBACK_SCHEMES.has(callbackUrl.protocol)
  ) {
    return false;
  }

  if (callbackUrl.protocol === HTTPS_SCHEME) {
    return callbackUrl.hostname.length > 0;
  }

  return callbackUrl.protocol.length > 1;
}

export function parseExternalRunRequest(
  value: string,
): ExternalRunRequest | null {
  const requestUrl = parseUrl(value);
  if (
    !requestUrl ||
    requestUrl.protocol !== EXTERNAL_RUN_SCHEME ||
    requestUrl.hostname !== EXTERNAL_RUN_HOST ||
    (requestUrl.pathname !== '' && requestUrl.pathname !== '/')
  ) {
    return null;
  }

  const checklistId = requestUrl.searchParams.get('checklistId');
  const callbackUrl = requestUrl.searchParams.get('callbackUrl');
  if (
    !checklistId ||
    checklistId.trim().length === 0 ||
    !callbackUrl ||
    !isSupportedCallbackUrl(callbackUrl)
  ) {
    return null;
  }

  return { checklistId, callbackUrl };
}

export function buildExternalRunCallbackUrl(
  callbackUrl: string,
  result: ExternalRunResult,
): string {
  const resultUrl = new URL(callbackUrl);
  resultUrl.searchParams.set('status', result.status);
  resultUrl.searchParams.set('checklistId', result.checklistId);

  if (result.status === 'completed') {
    resultUrl.searchParams.set('runId', result.runId);
  } else {
    resultUrl.searchParams.delete('runId');
  }

  return resultUrl.toString();
}
