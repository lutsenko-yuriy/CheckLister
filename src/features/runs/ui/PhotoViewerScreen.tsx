import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../navigation/types';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { useKillSwitch } from '../../../shared/killSwitches/useKillSwitches';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { IconButton } from '../../../shared/ui/IconButton';
import { findAttachment } from '../domain/models';
import { useRuns } from '../useRuns';
import { useI18n } from '@checklister/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoViewer'>;

export function PhotoViewerScreen({ navigation, route }: Props) {
  const { context, runId, attachmentId } = route.params;
  const styles = useStyles();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { activeRun, removePhoto, photoUri } = useRuns();
  const photosEnabled = useKillSwitch('photos');
  const closingRef = useRef(false);
  const found =
    activeRun && activeRun.id === runId
      ? findAttachment(activeRun, attachmentId)
      : null;
  const visible = photosEnabled && found !== null;

  const close = () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    navigation.goBack();
  };

  // The photo or the whole feature can disappear under an open viewer
  // (replaced run, removed photo, kill-switch): leave exactly once.
  useEffect(() => {
    if (!visible) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const target = found?.target;
  useLayoutEffect(() => {
    if (target) {
      analytics.logScreenView('screen_photo_viewer', { context, target });
    }
  }, [context, target]);

  if (!found || !activeRun) {
    return <View style={styles.container} />;
  }

  const confirmRemove = () => {
    Alert.alert(t('photos.removeTitle'), t('photos.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('photos.remove'),
        style: 'destructive',
        onPress: () => {
          if (closingRef.current) {
            return;
          }
          analytics.logEvent('photo_removed', {
            checklist_id: activeRun.checklistId,
            target: found.target,
          });
          closingRef.current = true;
          removePhoto(attachmentId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photoUri(found.attachment) }}
        resizeMode="contain"
        style={styles.image}
        testID="photo-viewer-image"
      />
      <View style={[styles.closeButton, { top: insets.top + 8 }]}>
        <IconButton
          icon="close"
          accessibilityLabel={t('photos.close')}
          onPress={close}
          color="#fff"
        />
      </View>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={confirmRemove}
          accessibilityRole="button"
          accessibilityLabel={t('photos.remove')}
          style={styles.removeButton}
        >
          <Text style={styles.removeText}>{t('photos.remove')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// A photo viewer is dark in both themes, like the system Photos apps.
const useStyles = createThemedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
  },
  actions: {
    alignItems: 'center',
    paddingTop: 12,
  },
  removeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  removeText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
}));
