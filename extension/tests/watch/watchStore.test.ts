import { describe, expect, it } from "vitest";
import { DEFAULT_WATCH_STATE } from "../../src/watch/watchState";
import {
  createWatchStore,
  type KeyValueArea,
  WATCH_DELIVERED_KEYS_KEY,
  WATCH_PENDING_LISTINGS_KEY,
  WATCH_STATE_KEY,
} from "../../src/watch/watchStore";
import { aCapturedListing, DELIVERED, watchingState } from "./watchFakes";

function inMemoryArea(initial: Record<string, unknown> = {}): KeyValueArea {
  const items = new Map(Object.entries(initial));
  return {
    get: async (key) => (items.has(key) ? { [key]: items.get(key) } : {}),
    set: async (changes) => {
      for (const [key, value] of Object.entries(changes)) {
        items.set(key, structuredClone(value));
      }
    },
  };
}

describe("createWatchStore", () => {
  it("starts with watching off when nothing is stored", async () => {
    const store = createWatchStore(inMemoryArea());

    expect(await store.loadState()).toEqual(DEFAULT_WATCH_STATE);
    expect(DEFAULT_WATCH_STATE.isEnabled).toBe(false);
  });

  it("keeps watching on for a state stored before the catch-up existed", async () => {
    const { nextCatchUpPage, isAwaitingCatchUpPage, ...storedBeforeCatchUp } = watchingState();
    const store = createWatchStore(inMemoryArea({ [WATCH_STATE_KEY]: storedBeforeCatchUp }));

    const state = await store.loadState();

    expect(state.isEnabled).toBe(true);
    expect(state.nextCatchUpPage).toBe(2);
    expect(state.isAwaitingCatchUpPage).toBe(false);
    expect([nextCatchUpPage, isAwaitingCatchUpPage]).toEqual([21, false]);
  });

  it("keeps the state, the last delivery and the stop across reads", async () => {
    const store = createWatchStore(inMemoryArea());
    const state = watchingState({
      attentionReason: "noReport",
      lastDelivery: { at: "2026-11-14T15:00:00.000Z", outcome: DELIVERED },
    });

    await store.storeState(state);

    expect(await store.loadState()).toEqual(state);
  });

  it("falls back to watching off when the stored state is not recognised", async () => {
    const area = inMemoryArea({ [WATCH_STATE_KEY]: { isEnabled: true, tabId: "7" } });

    expect(await createWatchStore(area).loadState()).toEqual(DEFAULT_WATCH_STATE);
  });

  it("keeps the pending listings and the delivered keys", async () => {
    const store = createWatchStore(inMemoryArea());

    await store.storePendingListings([aCapturedListing()]);
    await store.storeDeliveredKeys(["1:900:null"]);

    expect(await store.loadPendingListings()).toEqual([aCapturedListing()]);
    expect(await store.loadDeliveredKeys()).toEqual(["1:900:null"]);
  });

  it("ignores pending listings and delivered keys that are not recognised", async () => {
    const area = inMemoryArea({
      [WATCH_PENDING_LISTINGS_KEY]: [{ externalId: "1" }],
      [WATCH_DELIVERED_KEYS_KEY]: [1, 2],
    });
    const store = createWatchStore(area);

    expect(await store.loadPendingListings()).toEqual([]);
    expect(await store.loadDeliveredKeys()).toEqual([]);
  });
});
