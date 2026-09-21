import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  activateExternalLinkHandoff,
  deactivateExternalLinkHandoff,
} from './externalLinkNativeHandoff';

interface ExternalLinkQueue {
  readonly pendingUrls: readonly string[];
  dequeueUrl(): void;
}

// Owns the single incoming-URL queue shared by every external-link verb:
// the Linking listener, getInitialURL(), the native pending-URL drain and
// the cross-channel dedupe. Extracted verbatim from the coordinator
// (CheL-40 WU4) so a single consumer still handles cold-start ordering and
// dedupe regardless of which verb a URL turns out to carry.
export function useExternalLinkQueue(): ExternalLinkQueue {
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);

  const enqueueUrl = useCallback((url: string) => {
    setPendingUrls(current => [...current, url]);
  }, []);

  const dequeueUrl = useCallback(() => {
    setPendingUrls(current => current.slice(1));
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
        console.error('Failed to read the initial external-link URL');
      }

      if (!mounted) {
        return;
      }

      let nativePendingUrls: string[] = [];
      try {
        nativePendingUrls = await activateExternalLinkHandoff();
      } catch {
        console.error('Failed to activate the external-link URL handoff');
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
        console.error('Failed to bootstrap external-link URLs');
      }
    });

    return () => {
      mounted = false;
      deactivateExternalLinkHandoff();
      subscription.remove();
    };
  }, [enqueueUrl]);

  return { pendingUrls, dequeueUrl };
}
