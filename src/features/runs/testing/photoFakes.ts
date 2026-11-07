import { Attachment } from '../domain/models';
import { AttachmentStore } from '../domain/attachmentStore';
import { PhotoPicker, PhotoSource, PickResult } from '../domain/photoPicker';

export interface FakeAttachmentStore extends AttachmentStore {
  importPhoto: jest.MockedFunction<AttachmentStore['importPhoto']>;
  remove: jest.MockedFunction<AttachmentStore['remove']>;
  removeRun: jest.MockedFunction<AttachmentStore['removeRun']>;
  listRunIds: jest.MockedFunction<AttachmentStore['listRunIds']>;
  /** Run ids with a folder, as `listRunIds` reports them. */
  folders: Set<string>;
}

export function makeFakeAttachmentStore(): FakeAttachmentStore {
  let counter = 0;
  const folders = new Set<string>();
  return {
    folders,
    importPhoto: jest.fn(
      async (runId: string, _uri: string): Promise<Attachment> => {
        counter += 1;
        folders.add(runId);
        const id = `att-${counter}`;
        return {
          id,
          kind: 'photo',
          path: `attachments/${runId}/${id}.jpg`,
          addedAt: '2026-11-07T10:00:00.000Z',
        };
      },
    ),
    remove: jest.fn(async (_attachment: Attachment) => undefined),
    removeRun: jest.fn(async (runId: string) => {
      folders.delete(runId);
    }),
    listRunIds: jest.fn(async () => [...folders]),
    uriFor: (attachment: Attachment) => `file:///${attachment.path}`,
  };
}

export interface FakePhotoPicker extends PhotoPicker {
  pick: jest.MockedFunction<PhotoPicker['pick']>;
}

export function makeFakePhotoPicker(
  result: PickResult = { type: 'picked', uri: 'file:///cache/pick.jpg' },
): FakePhotoPicker {
  return { pick: jest.fn(async (_source: PhotoSource) => result) };
}

/** Inert store and picker for tests that do not exercise photos. */
export function photoDeps() {
  return {
    attachmentStore: makeFakeAttachmentStore(),
    photoPicker: makeFakePhotoPicker(),
  };
}
