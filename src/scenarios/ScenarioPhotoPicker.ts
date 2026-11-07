import { Dirs, FileSystem } from 'react-native-file-access';
import { generateId } from '../shared/ids';
import {
  PhotoPicker,
  PhotoSource,
  PickResult,
} from '../features/runs/domain/photoPicker';

export type ScenarioPhotoResult = 'picked' | 'denied' | 'cancelled';

// A 1x1 JPEG: enough for the file to move, store and render as a thumbnail.
const FIXTURE_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

// Scenario builds only (CheL-147): the iOS simulator has no camera and emulator photo
// libraries are empty, so flows set the outcome through checklister://scenarios/photo-picker.
export class ScenarioPhotoPicker implements PhotoPicker {
  private result: ScenarioPhotoResult = 'picked';

  setResult(result: ScenarioPhotoResult): void {
    this.result = result;
  }

  async pick(_source: PhotoSource): Promise<PickResult> {
    if (this.result !== 'picked') {
      return { type: this.result };
    }
    const path = `${Dirs.CacheDir}/scenario-${generateId()}.jpg`;
    try {
      await FileSystem.writeFile(path, FIXTURE_JPEG_BASE64, 'base64');
    } catch {
      return { type: 'failed' };
    }
    return { type: 'picked', uri: `file://${path}` };
  }
}

export const scenarioPhotoPicker = new ScenarioPhotoPicker();
