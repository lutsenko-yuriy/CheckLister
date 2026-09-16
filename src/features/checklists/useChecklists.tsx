import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {AsyncStorageChecklistRepository} from './data/asyncStorageChecklistRepository';
import {ChecklistRepository} from './domain/checklistRepository';
import {Checklist, createChecklist as buildChecklist} from './domain/models';

interface State {
  checklists: Checklist[];
  loading: boolean;
}

type Action =
  | {type: 'LOADED'; checklists: Checklist[]}
  | {type: 'SET'; checklists: Checklist[]};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return {checklists: action.checklists, loading: false};
    case 'SET':
      return {...state, checklists: action.checklists};
    default:
      return state;
  }
}

interface ChecklistsContextValue extends State {
  createChecklist(title: string): void;
  renameChecklist(id: string, title: string): void;
  deleteChecklist(id: string): void;
}

const ChecklistsContext = createContext<ChecklistsContextValue | null>(null);

const defaultRepository = new AsyncStorageChecklistRepository();

export function ChecklistsProvider({
  children,
  repository = defaultRepository,
}: {
  children: React.ReactNode;
  repository?: ChecklistRepository;
}) {
  const [state, dispatch] = useReducer(reducer, {
    checklists: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    repository.getAll().then(checklists => {
      if (!cancelled) {
        dispatch({type: 'LOADED', checklists});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const persist = useCallback(
    (checklists: Checklist[]) => {
      dispatch({type: 'SET', checklists});
      repository.saveAll(checklists);
    },
    [repository],
  );

  const createChecklist = useCallback(
    (title: string) => {
      persist([...state.checklists, buildChecklist(title)]);
    },
    [persist, state.checklists],
  );

  const renameChecklist = useCallback(
    (id: string, title: string) => {
      persist(
        state.checklists.map(checklist =>
          checklist.id === id ? {...checklist, title} : checklist,
        ),
      );
    },
    [persist, state.checklists],
  );

  const deleteChecklist = useCallback(
    (id: string) => {
      persist(state.checklists.filter(checklist => checklist.id !== id));
    },
    [persist, state.checklists],
  );

  const value = useMemo(
    () => ({
      ...state,
      createChecklist,
      renameChecklist,
      deleteChecklist,
    }),
    [state, createChecklist, renameChecklist, deleteChecklist],
  );

  return (
    <ChecklistsContext.Provider value={value}>
      {children}
    </ChecklistsContext.Provider>
  );
}

export function useChecklists(): ChecklistsContextValue {
  const context = useContext(ChecklistsContext);
  if (!context) {
    throw new Error('useChecklists must be used within a ChecklistsProvider');
  }
  return context;
}
