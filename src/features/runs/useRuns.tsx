import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useRef,
} from 'react';
import { Checklist } from '../checklists/domain/models';
import {
  ChecklistRun,
  startRun as buildRun,
  toggleRunItem,
  completeRun as markRunComplete,
  RunHistoryEntry,
  toRunHistoryEntry,
} from './domain/models';
import { RunRepository } from './domain/runRepository';

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
    case 'CLEAR':
      return { ...state, activeRun: null };
    default:
      return state;
  }
}

interface RunsContextValue extends State {
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
}: {
  children: React.ReactNode;
  repository: RunRepository;
}) {
  const [state, dispatch] = useReducer(reducer, {
    activeRun: null,
    history: [],
    historyLoading: true,
  });
  const historyRef = useRef<RunHistoryEntry[]>([]);
  const initialLoadRef = useRef<Promise<RunHistoryEntry[]> | null>(null);
  const completionQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const initialLoad = repository.getAll();
    initialLoadRef.current = initialLoad;
    initialLoad
      .then(history => {
        if (!cancelled) {
          historyRef.current = history;
          dispatch({ type: 'LOADED', history });
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
  }, [repository]);

  const startRun = useCallback((checklist: Checklist) => {
    dispatch({ type: 'START', run: buildRun(checklist) });
  }, []);

  const startExternalRun = useCallback(
    (checklist: Checklist, callbackUrl: string) => {
      dispatch({
        type: 'START',
        run: buildRun(checklist, { type: 'external', callbackUrl }),
      });
    },
    [],
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
    dispatch({ type: 'CLEAR' });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      startRun,
      startExternalRun,
      toggleItem,
      completeRun,
      clearRun,
    }),
    [state, startRun, startExternalRun, toggleItem, completeRun, clearRun],
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
