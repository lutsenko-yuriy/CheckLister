import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
} from 'react-native-image-picker';
import { ImagePickerPhotoPicker } from './imagePickerPhotoPicker';

const camera = jest.mocked(launchCamera);
const library = jest.mocked(launchImageLibrary);

const respond = (response: ImagePickerResponse) => async () => response;

describe('ImagePickerPhotoPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the camera for one original-quality photo', async () => {
    camera.mockImplementation(
      respond({ assets: [{ uri: 'file:///cache/a.jpg' }] }),
    );

    const result = await new ImagePickerPhotoPicker().pick('camera');

    expect(result).toEqual({ type: 'picked', uri: 'file:///cache/a.jpg' });
    expect(camera).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'photo', quality: 1 }),
    );
    expect(library).not.toHaveBeenCalled();
  });

  it('asks the library for a single photo', async () => {
    library.mockImplementation(
      respond({ assets: [{ uri: 'file:///cache/b.jpg' }] }),
    );

    const result = await new ImagePickerPhotoPicker().pick('library');

    expect(result).toEqual({ type: 'picked', uri: 'file:///cache/b.jpg' });
    expect(library).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'photo', selectionLimit: 1 }),
    );
  });

  it.each<[ImagePickerResponse, string]>([
    [{ didCancel: true }, 'cancelled'],
    [{ errorCode: 'permission' }, 'denied'],
    [{ errorCode: 'camera_unavailable' }, 'unavailable'],
    [{ errorCode: 'others' }, 'failed'],
    [{}, 'failed'],
    [{ assets: [{}] }, 'failed'],
  ])('maps %j to %s', async (response, type) => {
    camera.mockImplementation(respond(response));

    const result = await new ImagePickerPhotoPicker().pick('camera');

    expect(result.type).toBe(type);
  });

  it('reports a thrown error as failed instead of rejecting', async () => {
    library.mockRejectedValue(new Error('boom'));

    const result = await new ImagePickerPhotoPicker().pick('library');

    expect(result).toEqual({ type: 'failed' });
  });
});
