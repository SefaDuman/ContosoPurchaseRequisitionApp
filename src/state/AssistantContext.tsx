/**
 * Controller for the Procurement Assistant drawer.
 *
 * Lets any screen open or close the assistant drawer (e.g. an "Ask assistant"
 * button on a requisition).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AssistantController {
  open: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
}

const AssistantContext = createContext<AssistantController | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openAssistant = useCallback(() => setOpen(true), []);
  const closeAssistant = useCallback(() => setOpen(false), []);

  const value = useMemo<AssistantController>(
    () => ({ open, openAssistant, closeAssistant }),
    [open, openAssistant, closeAssistant],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAssistant(): AssistantController {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within an AssistantProvider');
  return ctx;
}
