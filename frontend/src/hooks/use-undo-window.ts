import { useEffect, useState } from "react";

export const UNDO_WINDOW_MILLISECONDS = 5000;

export function useUndoWindow<Item>() {
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (item === null) {
      return;
    }
    const timer = setTimeout(() => setItem(null), UNDO_WINDOW_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [item]);

  return { item, open: setItem, close: () => setItem(null) };
}
