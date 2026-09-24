import { Alert, Linking } from 'react-native';
import { analytics } from '../../shared/analytics/AnalyticsService';
import {
  buildExternalRunCallbackUrl,
  type ExternalRunResult,
} from './domain/externalRunLinks';

export async function deliverExternalRunResult(
  callbackUrl: string,
  result: ExternalRunResult,
  failureMessage: string,
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
    Alert.alert(failureMessage);
  }
}
