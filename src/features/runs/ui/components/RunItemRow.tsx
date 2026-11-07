import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RunItem } from '../../domain/models';
import { useTheme } from '../../../../shared/theme/useTheme';
import { createThemedStyles } from '../../../../shared/theme/createThemedStyles';
import { IconButton } from '../../../../shared/ui/IconButton';
import { PhotoThumbnail } from './PhotoThumbnail';
import { useI18n } from '@checklister/i18n';

export const RUN_ITEM_ROW_HEIGHT = 56;

/** Passed only while photos are enabled; without it the row has no photo UI. */
export interface RunItemPhotoControl {
  /** The displayable URI of the item's photo; null while it has none. */
  uri: string | null;
  onAdd: () => void;
  onOpen: () => void;
  addDisabled?: boolean;
}

export function RunItemRow({
  item,
  onToggle,
  photo,
}: {
  item: RunItem;
  onToggle: () => void;
  photo?: RunItemPhotoControl;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.row} testID={`run-item-row-${item.id}`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        style={styles.toggle}
      >
        <Icon
          name={item.checked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={item.checked ? colors.primary : colors.textMuted}
        />
        <View style={styles.textContainer}>
          <Text
            style={[styles.itemText, item.checked && styles.itemTextChecked]}
            numberOfLines={1}
          >
            {item.text}
          </Text>
        </View>
      </Pressable>
      {photo && item.photo && photo.uri ? (
        <View style={styles.photoSlot}>
          <PhotoThumbnail
            attachmentId={item.photo.id}
            uri={photo.uri}
            onPress={photo.onOpen}
          />
        </View>
      ) : photo ? (
        <IconButton
          icon="add-a-photo"
          accessibilityLabel={t('photos.addToItem', { item: item.text })}
          onPress={photo.onAdd}
          disabled={photo.addDisabled}
          testID={`add-item-photo-${item.id}`}
        />
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  row: {
    height: RUN_ITEM_ROW_HEIGHT,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  toggle: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  photoSlot: {
    marginHorizontal: 6,
  },
  itemText: {
    fontSize: 16,
    color: colors.text,
  },
  itemTextChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
}));
