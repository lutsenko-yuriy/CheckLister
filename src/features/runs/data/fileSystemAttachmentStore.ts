import { Platform } from 'react-native';
import { Dirs, FileSystem } from 'react-native-file-access';
import { generateId } from '../../../shared/ids';
import { AttachmentStore } from '../domain/attachmentStore';
import { Attachment } from '../domain/models';

const FOLDER = 'attachments';

/** App-private storage that device backups include; not visible in the Files app. */
function attachmentsRoot(): string {
  return Platform.OS === 'ios'
    ? `${Dirs.LibraryDir}/Application Support/${FOLDER}`
    : `${Dirs.DocumentDir}/${FOLDER}`;
}

function toFilePath(uri: string): string {
  const path = uri.replace(/^file:\/\//, '');
  try {
    return decodeURI(path);
  } catch {
    return path; // a stray '%' is not an escape: use the path as given
  }
}

export class FileSystemAttachmentStore implements AttachmentStore {
  async importPhoto(runId: string, sourceUri: string): Promise<Attachment> {
    const id = generateId();
    const path = `${runId}/${id}.jpg`;
    const source = toFilePath(sourceUri);
    const target = `${attachmentsRoot()}/${path}`;

    await FileSystem.mkdir(`${attachmentsRoot()}/${runId}`);
    try {
      await FileSystem.mv(source, target);
    } catch {
      // The picker's cache can sit on another volume; copy, then drop the original.
      await FileSystem.cp(source, target);
      await FileSystem.unlink(source).catch(() => undefined);
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
    if (!(await FileSystem.exists(root))) {
      return [];
    }
    const names = await FileSystem.ls(root);
    const isFolder = await Promise.all(
      names.map(name => FileSystem.isDir(`${root}/${name}`)),
    );
    return names.filter((_, i) => isFolder[i]);
  }

  uriFor(attachment: Attachment): string {
    return `file://${attachmentsRoot()}/${attachment.path}`;
  }

  private async unlinkIfPresent(path: string): Promise<void> {
    if (!(await FileSystem.exists(path))) {
      return;
    }
    try {
      await FileSystem.unlink(path);
    } catch (error) {
      // An overlapping removal may have won the race.
      if (await FileSystem.exists(path)) {
        throw error;
      }
    }
  }
}
