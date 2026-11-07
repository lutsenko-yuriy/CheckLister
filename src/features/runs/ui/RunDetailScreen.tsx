import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { useKillSwitch } from '../../../shared/killSwitches/useKillSwitches';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { useTheme } from '../../../shared/theme/useTheme';
import { photoCount, runPhotoCount } from '../domain/models';
import { useRuns } from '../useRuns';
import { PhotoThumbnail } from './components/PhotoThumbnail';
import { RunPhotoRow } from './components/RunPhotoRow';
import { useI18n } from '@checklister/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RunDetail'>;

export function RunDetailScreen({ navigation, route }: Props) {
  const { runId } = route.params;
  const styles = useStyles();
  const { colors } = useTheme();
  const { t, formatDateTime } = useI18n();
  const { history, photoUri } = useRuns();
  const photosEnabled = useKillSwitch('photos');
  const entry = history.find(e => e.id === runId);
  const hasLoggedView = useRef(false);

  const photos = photosEnabled ? entry?.photos ?? [] : [];
  const itemPhotoCount = photosEnabled
    ? photoCount({ items: entry?.items })
    : 0;

  useEffect(() => {
    if (!entry || hasLoggedView.current) {
      return;
    }
    hasLoggedView.current = true;
    analytics.logScreenView('screen_run_detail', {
      checklist_id: entry.checklistId,
      item_count: entry.itemCount,
      item_photo_count: itemPhotoCount,
      run_photo_count: photosEnabled ? runPhotoCount(entry) : 0,
    });
  }, [entry, itemPhotoCount, photosEnabled]);

  const openViewer = (attachmentId: string) =>
    navigation.navigate('PhotoViewer', {
      context: 'past_run',
      runId,
      attachmentId,
    });

  if (!entry) {
    return <View style={styles.container} testID="run-detail-screen" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="run-detail-screen"
    >
      <Text style={styles.title}>{entry.checklistTitle}</Text>
      <Text style={styles.subtitle}>
        {t('runHistory.row', {
          count: entry.itemCount,
          date: formatDateTime(entry.completedAt),
        })}
      </Text>
      {entry.items ? (
        entry.items.map(item => (
          <View
            key={item.id}
            style={styles.itemRow}
            testID={`run-detail-item-${item.id}`}
            accessible
            accessibilityState={{ checked: item.checked }}
          >
            <Icon
              name={item.checked ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={item.checked ? colors.primary : colors.textMuted}
            />
            <Text
              style={[styles.itemText, item.checked && styles.itemTextChecked]}
            >
              {item.text}
            </Text>
            {photosEnabled && item.photo ? (
              <PhotoThumbnail
                attachmentId={item.photo.id}
                uri={photoUri(item.photo)}
                onPress={() => openViewer(item.photo!.id)}
              />
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.note}>{t('runDetail.notRecorded')}</Text>
      )}
      {photos.length > 0 ? (
        <RunPhotoRow
          photos={photos}
          uriFor={photoUri}
          onOpen={photo => openViewer(photo.id)}
        />
      ) : null}
    </ScrollView>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  itemRow: {
    minHeight: 48,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  itemTextChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  note: {
    color: colors.textMuted,
  },
}));
