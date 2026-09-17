import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { ChecklistRepository } from './domain/checklistRepository';
import {
  Checklist,
  createChecklist as buildChecklist,
  createItem as buildItem,
  createSection as buildSection,
  moveItem as moveItemInChecklist,
  moveSection as moveSectionInChecklist,
} from './domain/models';

interface State {
  checklists: Checklist[];
  loading: boolean;
}

type Action =
  | { type: 'LOADED'; checklists: Checklist[] }
  | { type: 'SET'; checklists: Checklist[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
    case 'SET':
      return { checklists: action.checklists, loading: false };
    default:
      return state;
  }
}

interface ChecklistsContextValue extends State {
  createChecklist(title: string): void;
  renameChecklist(id: string, title: string): void;
  deleteChecklist(id: string): void;
  addItem(checklistId: string, text: string, sectionId?: string | null): void;
  editItem(checklistId: string, itemId: string, text: string): void;
  deleteItem(checklistId: string, itemId: string): void;
  addSection(checklistId: string, name: string): void;
  deleteSection(checklistId: string, sectionId: string): void;
  moveItem(
    checklistId: string,
    itemId: string,
    toSectionId: string | null,
    toIndex: number,
  ): void;
  moveSection(checklistId: string, sectionId: string, toIndex: number): void;
}

const ChecklistsContext = createContext<ChecklistsContextValue | null>(null);

export function ChecklistsProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: ChecklistRepository;
}) {
  const [state, dispatch] = useReducer(reducer, {
    checklists: [],
    loading: true,
  });
  // Tracks whether the in-memory state already reflects reality (either the
  // initial load resolved, or a mutation happened first) so a slow initial
  // `getAll()` can't clobber a mutation that raced ahead of it.
  const hasLoadedOrMutatedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    repository.getAll().then(checklists => {
      if (!cancelled && !hasLoadedOrMutatedRef.current) {
        hasLoadedOrMutatedRef.current = true;
        dispatch({ type: 'LOADED', checklists });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const persist = useCallback(
    (checklists: Checklist[]) => {
      hasLoadedOrMutatedRef.current = true;
      dispatch({ type: 'SET', checklists });
      repository.saveAll(checklists).catch(error => {
        console.error('Failed to persist checklists', error);
      });
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
          checklist.id === id ? { ...checklist, title } : checklist,
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

  const updateChecklist = useCallback(
    (checklistId: string, updateFn: (checklist: Checklist) => Checklist) => {
      persist(
        state.checklists.map(checklist =>
          checklist.id === checklistId ? updateFn(checklist) : checklist,
        ),
      );
    },
    [persist, state.checklists],
  );

  const updateChecklistItems = useCallback(
    (
      checklistId: string,
      updateItems: (items: Checklist['items']) => Checklist['items'],
    ) => {
      updateChecklist(checklistId, checklist => ({
        ...checklist,
        items: updateItems(checklist.items),
      }));
    },
    [updateChecklist],
  );

  const addItem = useCallback(
    (checklistId: string, text: string, sectionId: string | null = null) => {
      updateChecklistItems(checklistId, items => [
        ...items,
        buildItem(text, sectionId),
      ]);
    },
    [updateChecklistItems],
  );

  const editItem = useCallback(
    (checklistId: string, itemId: string, text: string) => {
      updateChecklistItems(checklistId, items =>
        items.map(item => (item.id === itemId ? { ...item, text } : item)),
      );
    },
    [updateChecklistItems],
  );

  const deleteItem = useCallback(
    (checklistId: string, itemId: string) => {
      updateChecklistItems(checklistId, items =>
        items.filter(item => item.id !== itemId),
      );
    },
    [updateChecklistItems],
  );

  const addSection = useCallback(
    (checklistId: string, name: string) => {
      updateChecklist(checklistId, checklist => ({
        ...checklist,
        sections: [...checklist.sections, buildSection(name)],
      }));
    },
    [updateChecklist],
  );

  const deleteSection = useCallback(
    (checklistId: string, sectionId: string) => {
      updateChecklist(checklistId, checklist => ({
        ...checklist,
        sections: checklist.sections.filter(
          section => section.id !== sectionId,
        ),
        items: checklist.items.map(item =>
          item.sectionId === sectionId ? { ...item, sectionId: null } : item,
        ),
      }));
    },
    [updateChecklist],
  );

  const moveItem = useCallback(
    (
      checklistId: string,
      itemId: string,
      toSectionId: string | null,
      toIndex: number,
    ) => {
      updateChecklist(checklistId, checklist =>
        moveItemInChecklist(checklist, itemId, toSectionId, toIndex),
      );
    },
    [updateChecklist],
  );

  const moveSection = useCallback(
    (checklistId: string, sectionId: string, toIndex: number) => {
      updateChecklist(checklistId, checklist =>
        moveSectionInChecklist(checklist, sectionId, toIndex),
      );
    },
    [updateChecklist],
  );

  const value = useMemo(
    () => ({
      ...state,
      createChecklist,
      renameChecklist,
      deleteChecklist,
      addItem,
      editItem,
      deleteItem,
      addSection,
      deleteSection,
      moveItem,
      moveSection,
    }),
    [
      state,
      createChecklist,
      renameChecklist,
      deleteChecklist,
      addItem,
      editItem,
      deleteItem,
      addSection,
      deleteSection,
      moveItem,
      moveSection,
    ],
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
