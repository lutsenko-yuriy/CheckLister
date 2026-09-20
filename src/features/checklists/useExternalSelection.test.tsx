import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  ExternalSelectionProvider,
  useExternalSelection,
} from './useExternalSelection';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ExternalSelectionProvider>{children}</ExternalSelectionProvider>;
}

describe('useExternalSelection', () => {
  it('starts with no pending callback url', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    expect(result.current.pendingCallbackUrl).toBeNull();
  });

  it('exposes the callback url after beginSelection', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    await act(async () => {
      result.current.beginSelection('caller-app://select-result');
    });

    expect(result.current.pendingCallbackUrl).toBe(
      'caller-app://select-result',
    );
  });

  it('re-points the pending callback url when a second selection begins', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    await act(async () => {
      result.current.beginSelection('caller-app://first');
    });
    await act(async () => {
      result.current.beginSelection('caller-app://second');
    });

    expect(result.current.pendingCallbackUrl).toBe('caller-app://second');
  });

  it('takePendingCallbackUrl reads and clears the pending callback url', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    await act(async () => {
      result.current.beginSelection('caller-app://select-result');
    });

    let taken: string | null = null;
    await act(async () => {
      taken = result.current.takePendingCallbackUrl();
    });

    expect(taken).toBe('caller-app://select-result');
    expect(result.current.pendingCallbackUrl).toBeNull();
  });

  it('takePendingCallbackUrl returns null when nothing is pending', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    let taken: string | null = 'not-null';
    await act(async () => {
      taken = result.current.takePendingCallbackUrl();
    });

    expect(taken).toBeNull();
  });

  it('takePendingCallbackUrl only delivers the pending url once', async () => {
    const { result } = await renderHook(() => useExternalSelection(), {
      wrapper,
    });

    await act(async () => {
      result.current.beginSelection('caller-app://select-result');
    });
    await act(async () => {
      result.current.takePendingCallbackUrl();
    });

    let secondTake: string | null = 'not-null';
    await act(async () => {
      secondTake = result.current.takePendingCallbackUrl();
    });

    expect(secondTake).toBeNull();
  });

  it('throws when used outside an ExternalSelectionProvider', async () => {
    const { result } = await renderHook(() => {
      try {
        return useExternalSelection();
      } catch (error) {
        return error;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
  });
});
