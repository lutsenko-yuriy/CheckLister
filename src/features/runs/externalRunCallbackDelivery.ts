import { Alert, Linking } from 'react-native';
import { analytics } from '../../shared/analytics/AnalyticsService';
import {
  buildExternalRunCallbackUrl,
  type ExternalRunResult,
} from './domain/externalRunLinks';

export const EXTERNAL_RUN_CALLBACK_FAILURE_MESSAGE =
  'Could not return the result to the calling app.';

export async function deliverExternalRunResult(
  callbackUrl: string,
  result: ExternalRunResult,
): Promise<void> {
  try {
    await Linking.openURL(buildExternalRunCallbackUrl(callbackUrl, result));
    analytics.logEvent('external_run_callback_finished', {
      status: result.status,
      delivered: true,
    });
  } catch {
    analytics.logEvent('external_run_callback_finished', {
      status: result.status,
      delivered: false,
    });
    Alert.alert(EXTERNAL_RUN_CALLBACK_FAILURE_MESSAGE);
  }
}
