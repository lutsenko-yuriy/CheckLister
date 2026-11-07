export type PhotoSource = 'camera' | 'library';

export type PickResult =
  | { type: 'picked'; uri: string }
  | { type: 'cancelled' }
  | { type: 'denied' }
  | { type: 'unavailable' }
  | { type: 'failed' };

export interface PhotoPicker {
  /** Never rejects; every failure is reported as a result. */
  pick(source: PhotoSource): Promise<PickResult>;
}
