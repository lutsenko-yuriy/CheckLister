import { Alert, Linking } from 'react-native';
import { analytics } from '../../shared/analytics/AnalyticsService';
import {
  buildExternalSelectCallbackUrl,
  type ExternalSelectResult,
} from './domain/externalSelectLinks';

export async function deliverExternalSelectResult(
  callbackUrl: string,
  result: ExternalSelectResult,
  failureMessage: string,
): Promise<void> {
  try {
    await Linking.openURL(buildExternalSelectCallbackUrl(callbackUrl, result));
    analytics.logEvent('external_select_callback_finished', {
      status: result.status,
      delivered: true,
    });
  } catch {
    analytics.logEvent('external_select_callback_finished', {
      status: result.status,
      delivered: false,
    });
    Alert.alert(failureMessage);
  }
}
