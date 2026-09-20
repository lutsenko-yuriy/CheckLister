import {
  applyCallbackParams,
  EXTERNAL_LINK_SCHEME,
  isSupportedCallbackUrl,
  parseAbsoluteUrl,
} from '../../../shared/links/externalLinkUrls';

const EXTERNAL_RUN_HOST = 'run';

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

export function parseExternalRunRequest(
  value: string,
): ExternalRunRequest | null {
  const requestUrl = parseAbsoluteUrl(value);
  if (
    !requestUrl ||
    requestUrl.protocol !== EXTERNAL_LINK_SCHEME ||
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
  return applyCallbackParams(callbackUrl, {
    status: result.status,
    checklistId: result.checklistId,
    runId: result.status === 'completed' ? result.runId : undefined,
  });
}
