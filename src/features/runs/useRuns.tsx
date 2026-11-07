import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Checklist } from '../checklists/domain/models';
import {
  Attachment,
  ChecklistRun,
  addRunPhoto,
  attachItemPhoto,
  findAttachment,
  removeItemPhoto,
  removeRunPhoto,
  startRun as buildRun,
  toggleRunItem,
  completeRun as markRunComplete,
  RunHistoryEntry,
  toRunHistoryEntry,
} from './domain/models';
import { AttachmentStore } from './domain/attachmentStore';
import { PhotoPicker, PhotoSource } from './domain/photoPicker';
import { RunRepository } from './domain/runRepository';

export type PhotoTarget = { type: 'item'; runItemId: string } | { type: 'run' };

export type AttachPhotoResult =
  | { type: 'attached'; target: 'item' | 'run' }
  | { type: 'cancelled' | 'denied' | 'unavailable' | 'failed' | 'stale' };

interface State {
  activeRun: ChecklistRun | null;
  history: RunHistoryEntry[];
  historyLoading: boolean;
}

type Action =
  | { type: 'LOADED'; history: RunHistoryEntry[] }
  | { type: 'START'; run: ChecklistRun }
  | { type: 'TOGGLE'; runItemId: string }
  | {
      type: 'COMPLETE';
      run: ChecklistRun;
      history: RunHistoryEntry[];
    }
  | {
      type: 'ATTACH_PHOTO';
      runId: string;
      target: PhotoTarget;
      attachment: Attachment;
    }
  | { type: 'REMOVE_PHOTO'; attachmentId: string }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { ...state, history: action.history, historyLoading: false };
    case 'START':
      return { ...state, activeRun: action.run };
    case 'TOGGLE':
      return state.activeRun
        ? {
            ...state,
            activeRun: toggleRunItem(state.activeRun, action.runItemId),
          }
        : state;
    case 'COMPLETE':
      return {
        ...state,
        activeRun:
          state.activeRun?.id === action.run.id ? action.run : state.activeRun,
        history: action.history,
        historyLoading: false,
      };
    case 'ATTACH_PHOTO': {
      const run = state.activeRun;
      if (!run || run.id !== action.runId) {
        return state;
      }
      return {
        ...state,
        activeRun:
          action.target.type === 'item'
            ? attachItemPhoto(run, action.target.runItemId, action.attachment)
            : addRunPhoto(run, action.attachment),
      };
    }
    case 'REMOVE_PHOTO':
      return state.activeRun
        ? {
            ...state,
            activeRun: removeRunPhoto(
              removeItemPhoto(state.activeRun, action.attachmentId),
              action.attachmentId,
            ),
          }
        : state;
    case 'CLEAR':
      return { ...state, activeRun: null };
    default:
      return state;
  }
}

interface RunsContextValue extends State {
  /** True while a photo is being picked or stored; further attaches are `stale`. */
  attachingPhoto: boolean;
  attachPhoto(
    target: PhotoTarget,
    source: PhotoSource,
  ): Promise<AttachPhotoResult>;
  removePhoto(attachmentId: string): Promise<void>;
  startRun(checklist: Checklist): void;
  startExternalRun(checklist: Checklist, callbackUrl: string): void;
  toggleItem(runItemId: string): void;
  completeRun(): Promise<void>;
  clearRun(): void;
}

const RunsContext = createContext<RunsContextValue | null>(null);

export function RunsProvider({
  children,
  repository,
  attachmentStore,
  photoPicker,
}: {
  children: React.ReactNode;
  repository: RunRepository;
  attachmentStore: AttachmentStore;
  photoPicker: PhotoPicker;
}) {
  const [state, dispatch] = useReducer(reducer, {
    activeRun: null,
    history: [],
    historyLoading: true,
  });
  const historyRef = useRef<RunHistoryEntry[]>([]);
  const initialLoadRef = useRef<Promise<RunHistoryEntry[]> | null>(null);
  const completionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeRunRef = useRef<ChecklistRun | null>(null);
  activeRunRef.current = state.activeRun;
  const storeRef = useRef(attachmentStore);
  storeRef.current = attachmentStore;
  const pickerRef = useRef(photoPicker);
  pickerRef.current = photoPicker;
  const attachingRef = useRef(false);
  const [attachingPhoto, setAttachingPhoto] = useState(false);

  const discardFolder = useCallback((runId: string) => {
    storeRef.current.removeRun(runId).catch(error => {
      console.error('Failed to remove run photos', error);
    });
  }, []);

  /** Orphan folders: no history entry and not the run in progress. */
  const sweepOrphans = useCallback(async (isCancelled: () => boolean) => {
    try {
      for (const id of await storeRef.current.listRunIds()) {
        if (
          isCancelled() ||
          activeRunRef.current?.id === id ||
          historyRef.current.some(entry => entry.id === id)
        ) {
          continue;
        }
        await storeRef.current.removeRun(id);
      }
    } catch (error) {
      console.error('Failed to sweep run photos', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialLoad = repository.getAll();
    initialLoadRef.current = initialLoad;
    initialLoad
      .then(history => {
        if (!cancelled) {
          historyRef.current = history;
          dispatch({ type: 'LOADED', history });
          // Only after a successful load: an empty fallback would orphan everything.
          sweepOrphans(() => cancelled);
        }
      })
      .catch(error => {
        console.error('Failed to load run history', error);
        if (!cancelled) {
          historyRef.current = [];
          dispatch({ type: 'LOADED', history: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repository, sweepOrphans]);

  const beginRun = useCallback(
    (run: ChecklistRun) => {
      const previous = activeRunRef.current;
      if (previous && !previous.completedAt) {
        discardFolder(previous.id);
      }
      activeRunRef.current = run;
      dispatch({ type: 'START', run });
    },
    [discardFolder],
  );

  const startRun = useCallback(
    (checklist: Checklist) => beginRun(buildRun(checklist)),
    [beginRun],
  );

  const startExternalRun = useCallback(
    (checklist: Checklist, callbackUrl: string) =>
      beginRun(buildRun(checklist, { type: 'external', callbackUrl })),
    [beginRun],
  );

  const toggleItem = useCallback((runItemId: string) => {
    dispatch({ type: 'TOGGLE', runItemId });
  }, []);

  const completeRun = useCallback(async () => {
    if (!state.activeRun) {
      return;
    }

    const completedRun = markRunComplete(state.activeRun, new Date());
    const entry = toRunHistoryEntry(completedRun);
    const persistCompletion = async (): Promise<void> => {
      if (state.historyLoading && initialLoadRef.current) {
        try {
          await initialLoadRef.current;
        } catch {
          // The load effect establishes an empty history fallback.
        }
      }

      const history = [entry, ...historyRef.current].sort((a, b) =>
        b.completedAt.localeCompare(a.completedAt),
      );
      await repository.saveAll(history);
      historyRef.current = history;
      dispatch({ type: 'COMPLETE', run: completedRun, history });
    };

    const completion = completionQueueRef.current.then(persistCompletion);
    completionQueueRef.current = completion.catch(() => undefined);
    await completion;
  }, [repository, state.activeRun, state.historyLoading]);

  const clearRun = useCallback(() => {
    const run = activeRunRef.current;
    if (run && !run.completedAt) {
      discardFolder(run.id);
    }
    activeRunRef.current = null;
    dispatch({ type: 'CLEAR' });
  }, [discardFolder]);

  const attachPhoto = useCallback(
    async (
      target: PhotoTarget,
      source: PhotoSource,
    ): Promise<AttachPhotoResult> => {
      // Open run, and for an item target an item that exists with no photo yet.
      const canAttach = (run: ChecklistRun | null): run is ChecklistRun =>
        run !== null &&
        run.completedAt === null &&
        (target.type === 'run' ||
          run.items.find(i => i.id === target.runItemId)?.photo === null);
      const run = activeRunRef.current;
      if (attachingRef.current || !canAttach(run)) {
        return { type: 'stale' };
      }

      attachingRef.current = true;
      setAttachingPhoto(true);
      try {
        const picked = await pickerRef.current.pick(source);
        if (picked.type !== 'picked') {
          return { type: picked.type };
        }

        let attachment: Attachment;
        try {
          attachment = await storeRef.current.importPhoto(run.id, picked.uri);
        } catch (error) {
          console.error('Failed to store photo', error);
          return { type: 'failed' };
        }

        const current = activeRunRef.current;
        if (current?.id !== run.id || !canAttach(current)) {
          storeRef.current.remove(attachment).catch(error => {
            console.error('Failed to remove stale photo', error);
          });
          return { type: 'stale' };
        }

        dispatch({ type: 'ATTACH_PHOTO', runId: run.id, target, attachment });
        return { type: 'attached', target: target.type };
      } finally {
        attachingRef.current = false;
        setAttachingPhoto(false);
      }
    },
    [],
  );

  const removePhoto = useCallback(async (attachmentId: string) => {
    const run = activeRunRef.current;
    // A completed run's photos belong to its history entry.
    const found = run && !run.completedAt && findAttachment(run, attachmentId);
    if (!found) {
      return;
    }
    dispatch({ type: 'REMOVE_PHOTO', attachmentId });
    try {
      await storeRef.current.remove(found.attachment);
    } catch (error) {
      console.error('Failed to remove photo', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      attachingPhoto,
      attachPhoto,
      removePhoto,
      startRun,
      startExternalRun,
      toggleItem,
      completeRun,
      clearRun,
    }),
    [
      state,
      attachingPhoto,
      attachPhoto,
      removePhoto,
      startRun,
      startExternalRun,
      toggleItem,
      completeRun,
      clearRun,
    ],
  );

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

export function useRuns(): RunsContextValue {
  const context = useContext(RunsContext);
  if (!context) {
    throw new Error('useRuns must be used within a RunsProvider');
  }
  return context;
}
