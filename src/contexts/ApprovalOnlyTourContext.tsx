import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ApprovalOnlyTourContextValue = {
  isOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
};

const ApprovalOnlyTourContext = createContext<ApprovalOnlyTourContextValue | null>(null);

export function ApprovalOnlyTourProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, startTour, closeTour }),
    [isOpen, startTour, closeTour]
  );

  return (
    <ApprovalOnlyTourContext.Provider value={value}>
      {children}
    </ApprovalOnlyTourContext.Provider>
  );
}

export function useApprovalOnlyTour(): ApprovalOnlyTourContextValue {
  const ctx = useContext(ApprovalOnlyTourContext);
  if (!ctx) {
    return {
      isOpen: false,
      startTour: () => {},
      closeTour: () => {},
    };
  }
  return ctx;
}
