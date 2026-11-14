import * as z from "zod/mini";
import { type CapturedListing, capturedListingsSchema } from "../capture/capturedListing";
import type { WatchStore } from "./plusvaliaWatch";
import { DEFAULT_WATCH_STATE, type WatchState, watchStateSchema } from "./watchState";

export const WATCH_STATE_KEY = "watchState";
export const WATCH_PENDING_LISTINGS_KEY = "watchPendingListings";
export const WATCH_DELIVERED_KEYS_KEY = "watchDeliveredKeys";

const deliveredKeysSchema = z.array(z.string());

export interface KeyValueArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export async function loadWatchState(area: KeyValueArea): Promise<WatchState> {
  const stored = await area.get(WATCH_STATE_KEY);
  const parsed = watchStateSchema.safeParse(stored[WATCH_STATE_KEY]);
  return parsed.success ? parsed.data : DEFAULT_WATCH_STATE;
}

export function createWatchStore(area: KeyValueArea): WatchStore {
  return {
    loadState: () => loadWatchState(area),
    storeState: (state: WatchState) => area.set({ [WATCH_STATE_KEY]: state }),
    loadPendingListings: async (): Promise<CapturedListing[]> => {
      const stored = await area.get(WATCH_PENDING_LISTINGS_KEY);
      const parsed = capturedListingsSchema.safeParse(stored[WATCH_PENDING_LISTINGS_KEY]);
      return parsed.success ? parsed.data : [];
    },
    storePendingListings: (listings) => area.set({ [WATCH_PENDING_LISTINGS_KEY]: [...listings] }),
    loadDeliveredKeys: async (): Promise<string[]> => {
      const stored = await area.get(WATCH_DELIVERED_KEYS_KEY);
      const parsed = deliveredKeysSchema.safeParse(stored[WATCH_DELIVERED_KEYS_KEY]);
      return parsed.success ? parsed.data : [];
    },
    storeDeliveredKeys: (keys) => area.set({ [WATCH_DELIVERED_KEYS_KEY]: [...keys] }),
  };
}
