import { useSyncExternalStore } from "react";
import type { CreatedRequest } from "./requests";

/** The address stays out of storage: the device may be shared. */
export type SavedConfirmation = Omit<CreatedRequest, "address">;

const KEY = "laige-confirmation";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: SavedConfirmation | null = null;

function parse(raw: string | null): SavedConfirmation | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SavedConfirmation;
    return value.code && value.statusToken ? value : null;
  } catch {
    return null;
  }
}

function read(): SavedConfirmation | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked. The confirmation then lasts until the page closes.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function useSavedConfirmation(): SavedConfirmation | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function saveConfirmation(created: CreatedRequest) {
  const saved: Partial<CreatedRequest> = { ...created };
  delete saved.address;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    return;
  }
  notify();
}

export function clearConfirmation() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  notify();
}
