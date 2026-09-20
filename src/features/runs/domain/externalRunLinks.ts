const EXTERNAL_RUN_SCHEME = 'checklister:';
const EXTERNAL_RUN_HOST = 'run';
const SCRIPT_CALLBACK_SCHEME = ['java', 'script:'].join('');
const UNSUPPORTED_CALLBACK_SCHEMES = new Set([
  'about:',
  'blob:',
  'content:',
  'data:',
  'file:',
  'ftp:',
  'http:',
  'intent:',
  'mailto:',
  'market:',
  'sms:',
  'smsto:',
  'tel:',
  'ws:',
  'wss:',
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

interface ParsedAbsoluteUrl {
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
}

function parseAbsoluteUrl(value: string): ParsedAbsoluteUrl | null {
  if (value.trim() !== value) {
    return null;
  }

  const match =
    /^([a-z][a-z\d+.-]*:)\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(
      value,
    );
  if (!match || /\s/.test(match[2])) {
    return null;
  }

  try {
    return {
      protocol: match[1].toLowerCase(),
      hostname: match[2].toLowerCase(),
      pathname: match[3],
      searchParams: new URLSearchParams(match[4] ?? ''),
    };
  } catch {
    return null;
  }
}

function isSupportedCallbackUrl(value: string): boolean {
  const callbackUrl = parseAbsoluteUrl(value);
  if (!callbackUrl) {
    return false;
  }

  if (
    callbackUrl.protocol === EXTERNAL_RUN_SCHEME ||
    UNSUPPORTED_CALLBACK_SCHEMES.has(callbackUrl.protocol)
  ) {
    return false;
  }

  return callbackUrl.hostname.length > 0;
}

export function parseExternalRunRequest(
  value: string,
): ExternalRunRequest | null {
  const requestUrl = parseAbsoluteUrl(value);
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
  const parsedCallbackUrl = parseAbsoluteUrl(callbackUrl);
  if (!parsedCallbackUrl) {
    throw new TypeError('Invalid callback URL');
  }

  parsedCallbackUrl.searchParams.set('status', result.status);
  parsedCallbackUrl.searchParams.set('checklistId', result.checklistId);

  if (result.status === 'completed') {
    parsedCallbackUrl.searchParams.set('runId', result.runId);
  } else {
    parsedCallbackUrl.searchParams.delete('runId');
  }

  const hashIndex = callbackUrl.indexOf('#');
  const hash = hashIndex === -1 ? '' : callbackUrl.slice(hashIndex);
  const withoutHash =
    hashIndex === -1 ? callbackUrl : callbackUrl.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  const base =
    queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const query = parsedCallbackUrl.searchParams.toString();

  return `${base}${query ? `?${query}` : ''}${hash}`;
}
