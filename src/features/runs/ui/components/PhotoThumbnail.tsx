import React from 'react';
import { Image, Pressable } from 'react-native';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';
import { useI18n } from '@checklister/i18n';

export const PHOTO_THUMBNAIL_SIZE = 44;

export function PhotoThumbnail({
  attachmentId,
  uri,
  onPress,
}: {
  attachmentId: string;
  uri: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('photos.open')}
      testID={`photo-thumbnail-${attachmentId}`}
      style={styles.thumbnail}
    >
      <Image source={{ uri }} style={styles.image} />
    </Pressable>
  );
}

const useStyles = createThemedStyles(colors => ({
  thumbnail: {
    width: PHOTO_THUMBNAIL_SIZE,
    height: PHOTO_THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
}));
