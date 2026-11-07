import {
  CameraOptions,
  ImageLibraryOptions,
  ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { PhotoPicker, PhotoSource, PickResult } from '../domain/photoPicker';

// Original quality, no resize: the ticket sets no size limits.
const CAMERA_OPTIONS: CameraOptions = { mediaType: 'photo', quality: 1 };
const LIBRARY_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 1,
  selectionLimit: 1,
};

function toPickResult(response: ImagePickerResponse): PickResult {
  if (response.didCancel) {
    return { type: 'cancelled' };
  }
  switch (response.errorCode) {
    case 'permission':
      return { type: 'denied' };
    case 'camera_unavailable':
      return { type: 'unavailable' };
    case undefined:
      break;
    default:
      return { type: 'failed' };
  }
  const uri = response.assets?.[0]?.uri;
  return uri ? { type: 'picked', uri } : { type: 'failed' };
}

export class ImagePickerPhotoPicker implements PhotoPicker {
  async pick(source: PhotoSource): Promise<PickResult> {
    try {
      const response =
        source === 'camera'
          ? await launchCamera(CAMERA_OPTIONS)
          : await launchImageLibrary(LIBRARY_OPTIONS);
      return toPickResult(response);
    } catch {
      return { type: 'failed' };
    }
  }
}
