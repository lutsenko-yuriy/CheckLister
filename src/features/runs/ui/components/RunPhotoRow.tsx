import React from 'react';
import { Text, View } from 'react-native';
import type { Attachment } from '../../domain/models';
import { IconButton } from '../../../../shared/ui/IconButton';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';
import { PhotoThumbnail } from './PhotoThumbnail';
import { useI18n } from '@checklister/i18n';

export function RunPhotoRow({
  photos,
  uriFor,
  onOpen,
  onAdd,
  addDisabled = false,
}: {
  photos: readonly Attachment[];
  uriFor: (photo: Attachment) => string;
  onOpen: (photo: Attachment) => void;
  onAdd: () => void;
  addDisabled?: boolean;
}) {
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('photos.runTitle')}</Text>
      <View style={styles.row}>
        {photos.map(photo => (
          <View key={photo.id} style={styles.cell}>
            <PhotoThumbnail
              attachmentId={photo.id}
              uri={uriFor(photo)}
              onPress={() => onOpen(photo)}
            />
          </View>
        ))}
        <IconButton
          icon="add"
          accessibilityLabel={t('photos.addToRun')}
          onPress={onAdd}
          disabled={addDisabled}
          testID="add-run-photo"
        />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cell: {
    marginRight: 8,
    marginBottom: 4,
  },
}));
