import { Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { generateId } from '../../../shared/ids';
import { AttachmentStore } from '../domain/attachmentStore';
import { Attachment } from '../domain/models';

const FOLDER = 'attachments';

/** App-private storage that device backups include; not visible in the Files app. */
function attachmentsRoot(): string {
  return Platform.OS === 'ios'
    ? `${RNFS.LibraryDirectoryPath}/Application Support/${FOLDER}`
    : `${RNFS.DocumentDirectoryPath}/${FOLDER}`;
}

function toFilePath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

export class FileSystemAttachmentStore implements AttachmentStore {
  async importPhoto(runId: string, sourceUri: string): Promise<Attachment> {
    const id = generateId();
    const path = `${runId}/${id}.jpg`;
    const source = toFilePath(sourceUri);
    const target = `${attachmentsRoot()}/${path}`;

    await RNFS.mkdir(`${attachmentsRoot()}/${runId}`);
    try {
      await RNFS.moveFile(source, target);
    } catch {
      // The picker's cache can sit on another volume; copy, then drop the original.
      await RNFS.copyFile(source, target);
      await RNFS.unlink(source).catch(() => undefined);
    }

    return { id, kind: 'photo', path, addedAt: new Date().toISOString() };
  }

  async remove(attachment: Attachment): Promise<void> {
    await this.unlinkIfPresent(`${attachmentsRoot()}/${attachment.path}`);
  }

  async removeRun(runId: string): Promise<void> {
    await this.unlinkIfPresent(`${attachmentsRoot()}/${runId}`);
  }

  async listRunIds(): Promise<string[]> {
    const root = attachmentsRoot();
    if (!(await RNFS.exists(root))) {
      return [];
    }
    const entries = await RNFS.readDir(root);
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  }

  uriFor(attachment: Attachment): string {
    return `file://${attachmentsRoot()}/${attachment.path}`;
  }

  private async unlinkIfPresent(path: string): Promise<void> {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  }
}
