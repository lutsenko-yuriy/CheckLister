import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useChecklists } from '../features/checklists/useChecklists';
import {
  buildExternalRunCallbackUrl,
  parseExternalRunRequest,
} from '../features/runs/domain/externalRunLinks';
import { useRuns } from '../features/runs/useRuns';
import { analytics } from '../shared/analytics/AnalyticsService';
import { RootStackParamList } from './types';

const INVALID_CALLBACK_MESSAGE = 'We do not know which app to return to.';
const CALLBACK_FAILURE_MESSAGE =
  'Could not return the result to the calling app.';

interface ExternalRunLinkCoordinatorProps {
  readonly navigationReady: boolean;
  readonly navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}

export function ExternalRunLinkCoordinator({
  navigationReady,
  navigationRef,
}: ExternalRunLinkCoordinatorProps) {
  const { checklists, loading } = useChecklists();
  const { activeRun, startExternalRun } = useRuns();
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);

  const enqueueUrl = useCallback((url: string) => {
    setPendingUrls(current => [...current, url]);
  }, []);

  useEffect(() => {
    let mounted = true;
    const subscription = Linking.addEventListener('url', event => {
      enqueueUrl(event.url);
    });

    Linking.getInitialURL().then(url => {
      if (mounted && url) {
        enqueueUrl(url);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [enqueueUrl]);

  const handleUrl = useCallback(
    async (url: string) => {
      const request = parseExternalRunRequest(url);
      if (!request) {
        analytics.logEvent('external_run_request_handled', {
          outcome: 'invalid_callback',
          replaced_active_run: false,
        });
        Alert.alert(INVALID_CALLBACK_MESSAGE);
        return;
      }

      const checklist = checklists.find(
        item => item.id === request.checklistId,
      );
      if (!checklist || checklist.items.length === 0) {
        analytics.logEvent('external_run_request_handled', {
          outcome: 'error',
          replaced_active_run: false,
        });
        const callbackUrl = buildExternalRunCallbackUrl(request.callbackUrl, {
          status: 'error',
          checklistId: request.checklistId,
        });

        try {
          await Linking.openURL(callbackUrl);
          analytics.logEvent('external_run_callback_finished', {
            status: 'error',
            delivered: true,
          });
        } catch {
          analytics.logEvent('external_run_callback_finished', {
            status: 'error',
            delivered: false,
          });
          Alert.alert(CALLBACK_FAILURE_MESSAGE);
        }
        return;
      }

      const replacedActiveRun = activeRun !== null;
      startExternalRun(checklist, request.callbackUrl);
      navigationRef.navigate('Run', { checklistId: checklist.id });
      analytics.logEvent('external_run_request_handled', {
        outcome: 'started',
        replaced_active_run: replacedActiveRun,
      });
    },
    [activeRun, checklists, navigationRef, startExternalRun],
  );

  useEffect(() => {
    if (loading || !navigationReady || pendingUrls.length === 0) {
      return;
    }

    const [nextUrl] = pendingUrls;
    setPendingUrls(current => current.slice(1));
    handleUrl(nextUrl).catch(() => {
      Alert.alert(CALLBACK_FAILURE_MESSAGE);
    });
  }, [handleUrl, loading, navigationReady, pendingUrls]);

  return null;
}
