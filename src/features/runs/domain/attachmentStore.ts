import { Attachment } from './models';

export interface AttachmentStore {
  /** Moves the picked file into app storage; rejects if it cannot be stored. */
  importPhoto(runId: string, sourceUri: string): Promise<Attachment>;
  /** Deletes one stored photo; a missing file is not an error. */
  remove(attachment: Attachment): Promise<void>;
  /** Deletes every photo of a run; a missing folder is not an error. */
  removeRun(runId: string): Promise<void>;
  /** Run ids that currently have a folder in storage. */
  listRunIds(): Promise<string[]>;
  /** Absolute URI the image components can load. */
  uriFor(attachment: Attachment): string;
}
