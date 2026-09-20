export const EXTERNAL_LINK_SCHEME = 'checklister:';

const SCRIPT_CALLBACK_SCHEME = ['java', 'script:'].join('');
export const UNSUPPORTED_CALLBACK_SCHEMES = new Set([
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

interface ParsedAbsoluteUrl {
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
}

export function isValidIpv6Address(address: string): boolean {
  if (!/^[a-f\d:]+$/i.test(address)) {
    return false;
  }

  const compressionIndex = address.indexOf('::');
  if (compressionIndex !== address.lastIndexOf('::')) {
    return false;
  }

  const isValidSegment = (segment: string) => /^[a-f\d]{1,4}$/i.test(segment);
  if (compressionIndex === -1) {
    const segments = address.split(':');
    return segments.length === 8 && segments.every(isValidSegment);
  }

  const left = address.slice(0, compressionIndex);
  const right = address.slice(compressionIndex + 2);
  const leftSegments = left ? left.split(':') : [];
  const rightSegments = right ? right.split(':') : [];

  return (
    leftSegments.every(isValidSegment) &&
    rightSegments.every(isValidSegment) &&
    leftSegments.length + rightSegments.length < 8
  );
}

export function parseHostname(authority: string): string | null {
  if (authority.includes('@')) {
    return null;
  }

  let hostname = authority;
  let port: string | undefined;

  if (authority.startsWith('[')) {
    const closingBracket = authority.indexOf(']');
    if (closingBracket <= 1) {
      return null;
    }

    hostname = authority.slice(0, closingBracket + 1);
    const remainder = authority.slice(closingBracket + 1);
    if (remainder.length > 0) {
      if (!remainder.startsWith(':')) {
        return null;
      }
      port = remainder.slice(1);
    }

    const address = hostname.slice(1, -1);
    if (!isValidIpv6Address(address)) {
      return null;
    }
  } else {
    const colon = authority.lastIndexOf(':');
    if (colon !== -1) {
      if (authority.indexOf(':') !== colon) {
        return null;
      }
      hostname = authority.slice(0, colon);
      port = authority.slice(colon + 1);
    }

    if (!hostname || !/^[a-z\d._~-]+$/i.test(hostname)) {
      return null;
    }
  }

  if (port !== undefined && (!/^\d{1,5}$/.test(port) || Number(port) > 65535)) {
    return null;
  }

  return hostname.toLowerCase();
}

export function parseAbsoluteUrl(value: string): ParsedAbsoluteUrl | null {
  if (value.trim() !== value) {
    return null;
  }

  const match =
    /^([a-z][a-z\d+.-]*:)\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(
      value,
    );
  if (!match) {
    return null;
  }

  const hostname = parseHostname(match[2]);
  if (!hostname) {
    return null;
  }

  try {
    return {
      protocol: match[1].toLowerCase(),
      hostname,
      pathname: match[3],
      searchParams: new URLSearchParams(match[4] ?? ''),
    };
  } catch {
    return null;
  }
}

export function isSupportedCallbackUrl(value: string): boolean {
  const callbackUrl = parseAbsoluteUrl(value);
  if (!callbackUrl) {
    return false;
  }

  if (
    callbackUrl.protocol === EXTERNAL_LINK_SCHEME ||
    UNSUPPORTED_CALLBACK_SCHEMES.has(callbackUrl.protocol)
  ) {
    return false;
  }

  return callbackUrl.hostname.length > 0;
}

export function applyCallbackParams(
  callbackUrl: string,
  params: Record<string, string | undefined>,
): string {
  const parsedCallbackUrl = parseAbsoluteUrl(callbackUrl);
  if (!parsedCallbackUrl) {
    throw new TypeError('Invalid callback URL');
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      parsedCallbackUrl.searchParams.delete(key);
    } else {
      parsedCallbackUrl.searchParams.set(key, value);
    }
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

export function parseExternalLinkKind(value: string): 'run' | 'select' | null {
  const requestUrl = parseAbsoluteUrl(value);
  if (
    !requestUrl ||
    requestUrl.protocol !== EXTERNAL_LINK_SCHEME ||
    (requestUrl.pathname !== '' && requestUrl.pathname !== '/')
  ) {
    return null;
  }

  if (requestUrl.hostname === 'run') {
    return 'run';
  }

  if (requestUrl.hostname === 'select') {
    return 'select';
  }

  return null;
}
