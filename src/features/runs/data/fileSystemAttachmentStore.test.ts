import { Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { FileSystemAttachmentStore } from './fileSystemAttachmentStore';

const fs = RNFS as unknown as {
  __seedFile(path: string): void;
  __files(): string[];
  __dirs(): string[];
  __reset(): void;
  unlink: jest.Mock;
};

const IOS_ROOT = '/library/Application Support/attachments';

describe('FileSystemAttachmentStore', () => {
  beforeEach(() => {
    fs.__reset();
    jest.clearAllMocks();
  });

  it('moves the picked file to <runId>/<id>.jpg and returns a relative path', async () => {
    fs.__seedFile('/caches/pick.jpg');
    const store = new FileSystemAttachmentStore();

    const attachment = await store.importPhoto(
      'run-1',
      'file:///caches/pick.jpg',
    );

    expect(attachment.kind).toBe('photo');
    expect(attachment.path).toBe(`run-1/${attachment.id}.jpg`);
    expect(new Date(attachment.addedAt).toString()).not.toBe('Invalid Date');
    expect(fs.__files()).toEqual([`${IOS_ROOT}/${attachment.path}`]);
  });

  it('falls back to copying when moving fails, leaving no temp file behind', async () => {
    fs.__seedFile('/caches/pick.jpg');
    jest.mocked(RNFS.moveFile).mockRejectedValueOnce(new Error('cross-device'));
    const store = new FileSystemAttachmentStore();

    const attachment = await store.importPhoto('run-1', '/caches/pick.jpg');

    expect(fs.__files()).toEqual([`${IOS_ROOT}/${attachment.path}`]);
  });

  it('rejects when the file cannot be stored', async () => {
    const store = new FileSystemAttachmentStore();

    await expect(
      store.importPhoto('run-1', 'file:///caches/missing.jpg'),
    ).rejects.toThrow();
  });

  it('resolves a photo URI against the attachments root', () => {
    const store = new FileSystemAttachmentStore();

    expect(
      store.uriFor({
        id: 'a',
        kind: 'photo',
        path: 'run-1/a.jpg',
        addedAt: '2026-11-07T10:00:00.000Z',
      }),
    ).toBe(`file://${IOS_ROOT}/run-1/a.jpg`);
  });

  it('uses the app files directory on Android', () => {
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      expect(
        new FileSystemAttachmentStore().uriFor({
          id: 'a',
          kind: 'photo',
          path: 'run-1/a.jpg',
          addedAt: '',
        }),
      ).toBe('file:///docs/attachments/run-1/a.jpg');
    } finally {
      Platform.OS = original;
    }
  });

  it('removes one photo and keeps the others', async () => {
    fs.__seedFile('/caches/1.jpg');
    fs.__seedFile('/caches/2.jpg');
    const store = new FileSystemAttachmentStore();
    const first = await store.importPhoto('run-1', '/caches/1.jpg');
    const second = await store.importPhoto('run-1', '/caches/2.jpg');

    await store.remove(first);

    expect(fs.__files()).toEqual([`${IOS_ROOT}/${second.path}`]);
  });

  it('does not fail when the photo is already gone', async () => {
    const store = new FileSystemAttachmentStore();

    await expect(
      store.remove({
        id: 'x',
        kind: 'photo',
        path: 'run-1/x.jpg',
        addedAt: '',
      }),
    ).resolves.toBeUndefined();
  });

  it('removes a whole run folder', async () => {
    fs.__seedFile('/caches/1.jpg');
    fs.__seedFile('/caches/2.jpg');
    const store = new FileSystemAttachmentStore();
    await store.importPhoto('run-1', '/caches/1.jpg');
    await store.importPhoto('run-2', '/caches/2.jpg');

    await store.removeRun('run-1');

    expect(await store.listRunIds()).toEqual(['run-2']);
  });

  it('does not fail when the run folder is missing', async () => {
    await expect(
      new FileSystemAttachmentStore().removeRun('nope'),
    ).resolves.toBeUndefined();
  });

  it('lists no runs before anything was stored', async () => {
    expect(await new FileSystemAttachmentStore().listRunIds()).toEqual([]);
  });

  it('lists run folders only', async () => {
    fs.__seedFile(`${IOS_ROOT}/stray.txt`);
    fs.__seedFile('/caches/1.jpg');
    const store = new FileSystemAttachmentStore();
    await store.importPhoto('run-1', '/caches/1.jpg');

    expect(await store.listRunIds()).toEqual(['run-1']);
  });
});
