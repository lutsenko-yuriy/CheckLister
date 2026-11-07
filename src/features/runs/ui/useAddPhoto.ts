import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { runPhotoCount } from '../domain/models';
import type { PhotoSource } from '../domain/photoPicker';
import { useRuns, type PhotoTarget } from '../useRuns';
import { useI18n } from '@checklister/i18n';

/** The add-photo sheet and what follows a pick: analytics and the problem alerts. */
export function useAddPhoto() {
  const { t } = useI18n();
  const { activeRun, attachPhoto } = useRuns();
  const activeRunRef = useRef(activeRun);
  activeRunRef.current = activeRun;

  const attach = useCallback(
    async (target: PhotoTarget, source: PhotoSource) => {
      const run = activeRunRef.current;
      const runPhotosBefore = run ? runPhotoCount(run) : 0;
      const result = await attachPhoto(target, source);
      switch (result.type) {
        case 'attached':
          analytics.logEvent('photo_attached', {
            checklist_id: run?.checklistId ?? '',
            target: result.target,
            source,
            run_photo_count:
              runPhotosBefore + (result.target === 'run' ? 1 : 0),
          });
          break;
        case 'denied':
          analytics.logEvent('photo_permission_denied', { source });
          Alert.alert(t('photos.deniedTitle'), t('photos.deniedBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('photos.openSettings'),
              onPress: () => {
                Linking.openSettings().catch(() => undefined);
              },
            },
          ]);
          break;
        case 'unavailable':
          Alert.alert(
            t('photos.unavailableTitle'),
            t('photos.unavailableBody'),
          );
          break;
        case 'failed':
          Alert.alert(t('photos.failedTitle'), t('photos.failedBody'));
          break;
        default:
          break;
      }
    },
    [attachPhoto, t],
  );

  return useCallback(
    (target: PhotoTarget) => {
      Alert.alert(t('photos.addTitle'), undefined, [
        {
          text: t('photos.takePhoto'),
          onPress: () => attach(target, 'camera'),
        },
        {
          text: t('photos.chooseFromLibrary'),
          onPress: () => attach(target, 'library'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    },
    [attach, t],
  );
}
