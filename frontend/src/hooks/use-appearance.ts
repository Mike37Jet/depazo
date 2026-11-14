import { useCallback, useState } from "react";
import {
  type Appearance,
  applyAppearance,
  readAppearance,
  saveAppearance,
} from "../services/appearance";

function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch (error) {
    console.warn("local storage is not available", error);
    return undefined;
  }
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(() => readAppearance(browserStorage()));

  const update = useCallback((changes: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...changes };
      applyAppearance(next, document.documentElement);
      saveAppearance(next, browserStorage());
      return next;
    });
  }, []);

  return { appearance, update };
}

export function applyStoredAppearance() {
  applyAppearance(readAppearance(browserStorage()), document.documentElement);
}
