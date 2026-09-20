import {
  applyCallbackParams,
  EXTERNAL_LINK_SCHEME,
  isSupportedCallbackUrl,
  parseAbsoluteUrl,
} from '../../../shared/links/externalLinkUrls';

const EXTERNAL_SELECT_HOST = 'select';

export interface ExternalSelectRequest {
  readonly callbackUrl: string;
}

export type ExternalSelectResult =
  | {
      readonly status: 'selected';
      readonly checklistId: string;
      readonly checklistName: string;
    }
  | {
      readonly status: 'cancelled' | 'error';
    };

export function parseExternalSelectRequest(
  value: string,
): ExternalSelectRequest | null {
  const requestUrl = parseAbsoluteUrl(value);
  if (
    !requestUrl ||
    requestUrl.protocol !== EXTERNAL_LINK_SCHEME ||
    requestUrl.hostname !== EXTERNAL_SELECT_HOST ||
    (requestUrl.pathname !== '' && requestUrl.pathname !== '/')
  ) {
    return null;
  }

  const callbackUrl = requestUrl.searchParams.get('callbackUrl');
  if (!callbackUrl || !isSupportedCallbackUrl(callbackUrl)) {
    return null;
  }

  return { callbackUrl };
}

export function buildExternalSelectCallbackUrl(
  callbackUrl: string,
  result: ExternalSelectResult,
): string {
  return applyCallbackParams(callbackUrl, {
    status: result.status,
    checklistId: result.status === 'selected' ? result.checklistId : undefined,
    checklistName:
      result.status === 'selected' ? result.checklistName : undefined,
  });
}
