import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

interface ExternalSelectionContextValue {
  pendingCallbackUrl: string | null;
  beginSelection(callbackUrl: string): void;
  takePendingCallbackUrl(): string | null;
}

const ExternalSelectionContext =
  createContext<ExternalSelectionContextValue | null>(null);

export function ExternalSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingCallbackUrl, setPendingCallbackUrl] = useState<string | null>(
    null,
  );
  const pendingCallbackUrlRef = useRef<string | null>(null);

  const beginSelection = useCallback((callbackUrl: string) => {
    pendingCallbackUrlRef.current = callbackUrl;
    setPendingCallbackUrl(callbackUrl);
  }, []);

  const takePendingCallbackUrl = useCallback((): string | null => {
    const callbackUrl = pendingCallbackUrlRef.current;
    pendingCallbackUrlRef.current = null;
    setPendingCallbackUrl(null);
    return callbackUrl;
  }, []);

  return (
    <ExternalSelectionContext.Provider
      value={{ pendingCallbackUrl, beginSelection, takePendingCallbackUrl }}
    >
      {children}
    </ExternalSelectionContext.Provider>
  );
}

export function useExternalSelection(): ExternalSelectionContextValue {
  const context = useContext(ExternalSelectionContext);
  if (!context) {
    throw new Error(
      'useExternalSelection must be used within an ExternalSelectionProvider',
    );
  }
  return context;
}
