"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Tip } from "@/lib/assistant";
import type { AssistantData } from "@/lib/types";
import { Assistant } from "./assistant";

/** What the current page tells Anna. Only the calculator sets anything. */
export type AssistantPageState = {
  tips: Tip[];
  /** The phone's price bar is on screen, so Anna sits above it. */
  raised: boolean;
  /** The expanded price summary needs the corner Anna sits in. */
  hidden: boolean;
};

const EMPTY_STATE: AssistantPageState = { tips: [], raised: false, hidden: false };

const AssistantPageContext = createContext<((state: AssistantPageState) => void) | null>(null);

export function AssistantShell({ assistant, children }: { assistant: AssistantData | null; children: ReactNode }) {
  const [pageState, setPageState] = useState(EMPTY_STATE);

  return (
    <AssistantPageContext.Provider value={setPageState}>
      {children}
      {assistant && <Assistant {...assistant} {...pageState} />}
    </AssistantPageContext.Provider>
  );
}

export function useAssistantPageState({ tips, raised, hidden }: AssistantPageState) {
  const setPageState = useContext(AssistantPageContext);

  useEffect(() => {
    setPageState?.({ tips, raised, hidden });
  }, [setPageState, tips, raised, hidden]);

  // Leaving the calculator takes its tips along.
  useEffect(() => () => setPageState?.(EMPTY_STATE), [setPageState]);
}
