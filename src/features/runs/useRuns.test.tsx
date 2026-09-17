import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { RunsProvider, useRuns } from './useRuns';
import { createChecklist, createItem } from '../checklists/domain/models';

function wrapper({ children }: { children: React.ReactNode }) {
  return <RunsProvider>{children}</RunsProvider>;
}

describe('useRuns', () => {
  it('has no active run initially', async () => {
    const { result } = await renderHook(() => useRuns(), { wrapper });

    expect(result.current.activeRun).toBeNull();
  });

  it('starting a run exposes it as the active run', async () => {
    const { result } = await renderHook(() => useRuns(), { wrapper });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await act(async () => {
      result.current.startRun(checklist);
    });

    expect(result.current.activeRun?.checklistId).toBe(checklist.id);
    expect(result.current.activeRun?.items).toHaveLength(1);
  });

  it('toggling an item updates only the targeted item', async () => {
    const { result } = await renderHook(() => useRuns(), { wrapper });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };

    await act(async () => {
      result.current.startRun(checklist);
    });
    const targetId = result.current.activeRun!.items[0].id;

    await act(async () => {
      result.current.toggleItem(targetId);
    });

    expect(result.current.activeRun!.items[0].checked).toBe(true);
    expect(result.current.activeRun!.items[1].checked).toBe(false);
  });

  it('completeRun sets completedAt on the active run', async () => {
    const { result } = await renderHook(() => useRuns(), { wrapper });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await act(async () => {
      result.current.startRun(checklist);
    });

    await act(async () => {
      result.current.completeRun();
    });

    expect(result.current.activeRun?.completedAt).not.toBeNull();
  });

  it('clearRun empties the active run', async () => {
    const { result } = await renderHook(() => useRuns(), { wrapper });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await act(async () => {
      result.current.startRun(checklist);
    });
    await act(async () => {
      result.current.clearRun();
    });

    expect(result.current.activeRun).toBeNull();
  });

  it('throws when used outside a RunsProvider', async () => {
    await expect(renderHook(() => useRuns())).rejects.toThrow(
      'useRuns must be used within a RunsProvider',
    );
  });
});
