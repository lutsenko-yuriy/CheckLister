import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useChecklists } from '../features/checklists/useChecklists';
import { useExternalSelection } from '../features/checklists/useExternalSelection';
import { parseExternalSelectRequest } from '../features/checklists/domain/externalSelectLinks';
import { deliverExternalSelectResult } from '../features/checklists/externalSelectCallbackDelivery';
import { parseExternalRunRequest } from '../features/runs/domain/externalRunLinks';
import { deliverExternalRunResult } from '../features/runs/externalRunCallbackDelivery';
import { useRuns } from '../features/runs/useRuns';
import { analytics } from '../shared/analytics/AnalyticsService';
import { parseExternalLinkKind } from '../shared/links/externalLinkUrls';
import { useExternalLinkQueue } from './useExternalLinkQueue';
import { RootStackParamList } from './types';

const INVALID_CALLBACK_MESSAGE = 'We do not know which app to return to.';
// Shown for an unexpected failure while dispatching a URL, distinct from
// the per-verb delivery-failure alerts each deliverExternal*Result already
// shows for an ordinary openURL rejection.
const UNEXPECTED_DISPATCH_FAILURE_MESSAGE =
  'Could not return the result to the calling app.';

function waitForNextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

interface ExternalLinkCoordinatorProps {
  readonly navigationReady: boolean;
  readonly navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}

// The only cross-feature coordinator: one component owns the whole
// incoming-URL queue (via useExternalLinkQueue) and dispatches each URL by
// verb (CheL-36 `run`, CheL-40 `select`). A second parallel coordinator
// would double-handle every URL and both would alert on unrecognised ones.
export function ExternalLinkCoordinator({
  navigationReady,
  navigationRef,
}: ExternalLinkCoordinatorProps) {
  const { checklists, loading } = useChecklists();
  const { activeRun, startExternalRun } = useRuns();
  const { beginSelection, takePendingCallbackUrl } = useExternalSelection();
  const { pendingUrls, dequeueUrl } = useExternalLinkQueue();

  const handleRunUrl = useCallback(
    async (url: string) => {
      // A `run` link preempts any picker left open above it: pop the
      // picker first (mirroring ChecklistSelectScreen's own navigate-then-
      // deliver ordering) so the cancelled callback's Linking.openURL —
      // which backgrounds the app — never races the in-flight pop
      // transition, then resolve the pending selection so its caller still
      // gets exactly one result.
      const pendingSelectionCallbackUrl = takePendingCallbackUrl();
      if (pendingSelectionCallbackUrl) {
        navigationRef.goBack();
        await waitForNextFrame();
        await deliverExternalSelectResult(pendingSelectionCallbackUrl, {
          status: 'cancelled',
        });
      }

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
    [activeRun, checklists, navigationRef, startExternalRun, takePendingCallbackUrl],
  );

  const handleSelectUrl = useCallback(
    async (url: string) => {
      const request = parseExternalSelectRequest(url);
      if (!request) {
        analytics.logEvent('external_select_request_handled', {
          outcome: 'invalid_callback',
        });
        Alert.alert(INVALID_CALLBACK_MESSAGE);
        return;
      }

      if (checklists.length === 0) {
        analytics.logEvent('external_select_request_handled', {
          outcome: 'error',
        });
        await deliverExternalSelectResult(request.callbackUrl, {
          status: 'error',
        });
        return;
      }

      // A second select request cancels the first caller and re-points
      // the picker at the new callback instead of pushing a second one.
      const previousCallbackUrl = takePendingCallbackUrl();
      if (previousCallbackUrl) {
        await deliverExternalSelectResult(previousCallbackUrl, {
          status: 'cancelled',
        });
      }
      beginSelection(request.callbackUrl);
      if (!previousCallbackUrl) {
        navigationRef.navigate('ChecklistSelect');
      }
      analytics.logEvent('external_select_request_handled', {
        outcome: 'opened',
      });
    },
    [beginSelection, checklists, navigationRef, takePendingCallbackUrl],
  );

  const handleUrl = useCallback(
    async (url: string) => {
      const kind = parseExternalLinkKind(url);

      if (kind === 'run') {
        await handleRunUrl(url);
        return;
      }

      if (kind === 'select') {
        await handleSelectUrl(url);
        return;
      }

      // Unrecognised URLs stay on the run event so CheL-36's existing
      // telemetry isn't re-attributed to a verb-agnostic event.
      analytics.logEvent('external_run_request_handled', {
        outcome: 'invalid_callback',
        replaced_active_run: false,
      });
      Alert.alert(INVALID_CALLBACK_MESSAGE);
    },
    [handleRunUrl, handleSelectUrl],
  );

  useEffect(() => {
    if (loading || !navigationReady || pendingUrls.length === 0) {
      return;
    }

    const [nextUrl] = pendingUrls;
    dequeueUrl();
    handleUrl(nextUrl).catch(() => {
      Alert.alert(UNEXPECTED_DISPATCH_FAILURE_MESSAGE);
    });
  }, [dequeueUrl, handleUrl, loading, navigationReady, pendingUrls]);

  return null;
}
