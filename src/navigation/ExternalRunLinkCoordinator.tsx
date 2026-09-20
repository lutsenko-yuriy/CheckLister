import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useChecklists } from '../features/checklists/useChecklists';
import { parseExternalRunRequest } from '../features/runs/domain/externalRunLinks';
import {
  deliverExternalRunResult,
  EXTERNAL_RUN_CALLBACK_FAILURE_MESSAGE,
} from '../features/runs/externalRunCallbackDelivery';
import { useRuns } from '../features/runs/useRuns';
import { analytics } from '../shared/analytics/AnalyticsService';
import {
  activateExternalRunLinkHandoff,
  deactivateExternalRunLinkHandoff,
} from './externalRunNativeHandoff';
import { RootStackParamList } from './types';

const INVALID_CALLBACK_MESSAGE = 'We do not know which app to return to.';

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
    let bootstrapComplete = false;
    const liveUrlsDuringBootstrap: string[] = [];
    const subscription = Linking.addEventListener('url', event => {
      if (bootstrapComplete) {
        enqueueUrl(event.url);
      } else {
        liveUrlsDuringBootstrap.push(event.url);
      }
    });

    async function bootstrapUrls() {
      let initialUrl: string | null = null;
      try {
        initialUrl = (await Linking.getInitialURL()) ?? null;
      } catch {
        console.error('Failed to read the initial external-run URL');
      }

      if (!mounted) {
        return;
      }

      let nativePendingUrls: string[] = [];
      try {
        nativePendingUrls = await activateExternalRunLinkHandoff();
      } catch {
        console.error('Failed to activate the external-run URL handoff');
      }

      if (!mounted) {
        return;
      }

      const orderedUrls = [
        ...(initialUrl ? [initialUrl] : []),
        ...nativePendingUrls,
        ...liveUrlsDuringBootstrap,
      ];
      bootstrapComplete = true;
      orderedUrls
        .filter((url, index) => orderedUrls.indexOf(url) === index)
        .forEach(enqueueUrl);
    }

    bootstrapUrls().catch(() => {
      if (mounted) {
        console.error('Failed to bootstrap external-run URLs');
      }
    });

    return () => {
      mounted = false;
      deactivateExternalRunLinkHandoff();
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
        await deliverExternalRunResult(request.callbackUrl, {
          status: 'error',
          checklistId: request.checklistId,
        });
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
      Alert.alert(EXTERNAL_RUN_CALLBACK_FAILURE_MESSAGE);
    });
  }, [handleUrl, loading, navigationReady, pendingUrls]);

  return null;
}
