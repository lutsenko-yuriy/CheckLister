import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Checklist } from '../checklists/domain/models';
import {
  ChecklistRun,
  startRun as buildRun,
  toggleRunItem,
  completeRun as markRunComplete,
} from './domain/models';

interface State {
  activeRun: ChecklistRun | null;
}

type Action =
  | { type: 'START'; run: ChecklistRun }
  | { type: 'TOGGLE'; runItemId: string }
  | { type: 'COMPLETE' }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return { activeRun: action.run };
    case 'TOGGLE':
      return state.activeRun
        ? { activeRun: toggleRunItem(state.activeRun, action.runItemId) }
        : state;
    case 'COMPLETE':
      return state.activeRun
        ? { activeRun: markRunComplete(state.activeRun, new Date()) }
        : state;
    case 'CLEAR':
      return { activeRun: null };
    default:
      return state;
  }
}

interface RunsContextValue extends State {
  startRun(checklist: Checklist): void;
  toggleItem(runItemId: string): void;
  completeRun(): void;
  clearRun(): void;
}

const RunsContext = createContext<RunsContextValue | null>(null);

export function RunsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { activeRun: null });

  const startRun = useCallback((checklist: Checklist) => {
    dispatch({ type: 'START', run: buildRun(checklist) });
  }, []);

  const toggleItem = useCallback((runItemId: string) => {
    dispatch({ type: 'TOGGLE', runItemId });
  }, []);

  const completeRun = useCallback(() => {
    dispatch({ type: 'COMPLETE' });
  }, []);

  const clearRun = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value = useMemo(
    () => ({ ...state, startRun, toggleItem, completeRun, clearRun }),
    [state, startRun, toggleItem, completeRun, clearRun],
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
