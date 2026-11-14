import { buildCaptureExport } from "../capture/captureCollection";
import type { CapturedListing, CaptureExport } from "../capture/capturedListing";
import {
  addPending,
  MINIMUM_DELIVERY_SPACING_MILLISECONDS,
  nextDeliveryBatch,
  rememberDelivered,
  withoutDelivered,
} from "./deliveredCaptures";
import type { DeliveryOutcome } from "./nativeDelivery";
import { createSerialQueue } from "./serialQueue";
import type { PageReport } from "./watchMessages";
import {
  catchUpPageUrl,
  decideWatchCycle,
  hasCatchUpPagesLeft,
  isReportOverdue,
  isWatchTabUrl,
  reportDeadline,
  WATCH_URL,
  type WatchCycleDecision,
} from "./watchSchedule";
import { needsAttention, type WatchState } from "./watchState";

export interface WatchTab {
  id: number;
  url: string | undefined;
}

export interface WatchTabs {
  find(tabId: number): Promise<WatchTab | null>;
  findExisting(): Promise<WatchTab | null>;
  hasWindow(): Promise<boolean>;
  open(url: string): Promise<number>;
  reload(tabId: number): Promise<void>;
  show(tabId: number, url: string): Promise<void>;
}

export interface WatchStore {
  loadState(): Promise<WatchState>;
  storeState(state: WatchState): Promise<void>;
  loadPendingListings(): Promise<CapturedListing[]>;
  storePendingListings(listings: readonly CapturedListing[]): Promise<void>;
  loadDeliveredKeys(): Promise<string[]>;
  storeDeliveredKeys(keys: readonly string[]): Promise<void>;
}

export interface WatchAlarms {
  scheduleReportDeadline(at: Date): Promise<void>;
  scheduleDelivery(at: Date): Promise<void>;
}

export interface AttentionBadge {
  show(): Promise<void>;
  clear(): Promise<void>;
}

export interface WatchPorts {
  now(): Date;
  isOnline(): boolean;
  store: WatchStore;
  tabs: WatchTabs;
  alarms: WatchAlarms;
  badge: AttentionBadge;
  deliverCapture(capture: CaptureExport): Promise<DeliveryOutcome>;
}

export type WatchCycleOutcome = WatchCycleDecision | "noWindow" | "offline";

export interface PlusvaliaWatch {
  runCycle(): Promise<WatchCycleOutcome>;
  enforceReportDeadline(): Promise<void>;
  acceptPageReport(report: PageReport, tabId: number, documentId?: string | null): Promise<boolean>;
  deliverPending(): Promise<void>;
  setEnabled(isEnabled: boolean): Promise<void>;
  resume(): Promise<void>;
  syncBadge(): Promise<void>;
}

function earliestNextDelivery(state: WatchState): Date | null {
  return state.lastDeliveryAttemptAt === null
    ? null
    : new Date(
        new Date(state.lastDeliveryAttemptAt).getTime() + MINIMUM_DELIVERY_SPACING_MILLISECONDS,
      );
}

export function createPlusvaliaWatch(ports: WatchPorts): PlusvaliaWatch {
  const { store, tabs, alarms, badge } = ports;
  const inOrder = createSerialQueue();
  let isDeliveryInFlight = false;

  async function showBadgeFor(state: WatchState): Promise<void> {
    await (state.isEnabled && needsAttention(state) ? badge.show() : badge.clear());
  }

  async function stopUntilResumed(state: WatchState): Promise<void> {
    const stopped: WatchState = {
      ...state,
      attentionReason: "noReport",
      awaitingReportSince: null,
      isAwaitingCatchUpPage: false,
    };
    await store.storeState(stopped);
    await showBadgeFor(stopped);
  }

  async function usableWatchTab(state: WatchState): Promise<WatchTab | null> {
    const stored = state.tabId === null ? null : await tabs.find(state.tabId);
    if (stored !== null && isWatchTabUrl(stored.url)) {
      return stored;
    }
    const existing = await tabs.findExisting();
    return existing !== null && isWatchTabUrl(existing.url) ? existing : null;
  }

  async function showNewestListings(tab: WatchTab): Promise<void> {
    await (tab.url === WATCH_URL ? tabs.reload(tab.id) : tabs.show(tab.id, WATCH_URL));
  }

  async function showCatchUpPage(state: WatchState, tabId: number): Promise<void> {
    const awaitingReportSince = ports.now().toISOString();
    await store.storeState({ ...state, awaitingReportSince, isAwaitingCatchUpPage: true });
    await alarms.scheduleReportDeadline(reportDeadline(awaitingReportSince));
    await tabs.show(tabId, catchUpPageUrl(state.nextCatchUpPage));
  }

  async function reloadWatchTab(state: WatchState, now: Date): Promise<boolean> {
    const existingTab = await usableWatchTab(state);
    if (existingTab === null && !(await tabs.hasWindow())) {
      return false;
    }
    const tabId = existingTab?.id ?? (await tabs.open(WATCH_URL));
    const awaitingReportSince = now.toISOString();
    await store.storeState({
      ...state,
      tabId,
      awaitingReportSince,
      isAwaitingCatchUpPage: false,
      lastReloadAt: awaitingReportSince,
    });
    await alarms.scheduleReportDeadline(reportDeadline(awaitingReportSince));
    if (existingTab !== null) {
      await showNewestListings(existingTab);
    }
    return true;
  }

  async function decideAndAct(): Promise<WatchCycleOutcome> {
    const state = await store.loadState();
    const now = ports.now();
    const decision = decideWatchCycle(state, now);
    if (decision === "reportOverdue") {
      await stopUntilResumed(state);
      return decision;
    }
    if (decision === "reload" && !ports.isOnline()) {
      return "offline";
    }
    if (decision === "reload" && !(await reloadWatchTab(state, now))) {
      return "noWindow";
    }
    return decision;
  }

  async function claimDeliveryBatch(): Promise<CapturedListing[]> {
    const state = await store.loadState();
    if (!state.isEnabled) {
      return [];
    }
    const batch = nextDeliveryBatch(
      await store.loadPendingListings(),
      await store.loadDeliveredKeys(),
    );
    if (batch.length === 0) {
      return [];
    }
    const now = ports.now();
    const earliest = earliestNextDelivery(state);
    if (earliest !== null && now.getTime() < earliest.getTime()) {
      await alarms.scheduleDelivery(earliest);
      return [];
    }
    await store.storeState({ ...state, lastDeliveryAttemptAt: now.toISOString() });
    return batch;
  }

  async function recordDelivery(
    batch: readonly CapturedListing[],
    outcome: DeliveryOutcome,
  ): Promise<void> {
    const finishedAt = ports.now().toISOString();
    const state: WatchState = {
      ...(await store.loadState()),
      lastDeliveryAttemptAt: finishedAt,
      lastDelivery: { at: finishedAt, outcome },
    };
    await store.storeState(state);
    if (outcome.kind !== "delivered") {
      return;
    }
    const deliveredKeys = rememberDelivered(await store.loadDeliveredKeys(), batch);
    const pending = withoutDelivered(await store.loadPendingListings(), batch);
    await store.storeDeliveredKeys(deliveredKeys);
    await store.storePendingListings(pending);
    const earliest = earliestNextDelivery(state);
    if (earliest !== null && nextDeliveryBatch(pending, deliveredKeys).length > 0) {
      await alarms.scheduleDelivery(earliest);
    }
  }

  async function deliverPending(): Promise<void> {
    if (isDeliveryInFlight) {
      return;
    }
    isDeliveryInFlight = true;
    try {
      const batch = await inOrder(claimDeliveryBatch);
      if (batch.length === 0) {
        return;
      }
      const outcome = await ports.deliverCapture(buildCaptureExport(batch, ports.now()));
      await inOrder(() => recordDelivery(batch, outcome));
    } finally {
      isDeliveryInFlight = false;
    }
  }

  return {
    runCycle: () => inOrder(decideAndAct),

    enforceReportDeadline: () =>
      inOrder(async () => {
        const state = await store.loadState();
        if (state.awaitingReportSince === null) {
          return;
        }
        if (isReportOverdue(state, ports.now())) {
          await stopUntilResumed(state);
          return;
        }
        await alarms.scheduleReportDeadline(reportDeadline(state.awaitingReportSince));
      }),

    acceptPageReport: (report, tabId, documentId = null) =>
      inOrder(async () => {
        const state = await store.loadState();
        const isFromWatchTab = state.tabId !== null && state.tabId === tabId;
        if (!state.isEnabled || needsAttention(state) || !isFromWatchTab) {
          return false;
        }
        const isFromDocumentBeforeReload =
          state.awaitingReportSince !== null &&
          documentId !== null &&
          documentId === state.lastReportDocumentId;
        if (isFromDocumentBeforeReload || report.listings.length === 0) {
          return false;
        }
        const reported: WatchState = {
          ...state,
          awaitingReportSince: null,
          isAwaitingCatchUpPage: false,
          nextCatchUpPage: state.isAwaitingCatchUpPage
            ? state.nextCatchUpPage + 1
            : state.nextCatchUpPage,
          lastReportDocumentId: documentId ?? state.lastReportDocumentId,
          lastCheckAt: ports.now().toISOString(),
        };
        await store.storeState(reported);
        await store.storePendingListings(
          addPending(
            await store.loadPendingListings(),
            report.listings,
            await store.loadDeliveredKeys(),
          ),
        );
        const isFirstReportOfTheCycle =
          state.awaitingReportSince !== null && !state.isAwaitingCatchUpPage;
        if (isFirstReportOfTheCycle && hasCatchUpPagesLeft(reported) && ports.isOnline()) {
          await showCatchUpPage(reported, tabId);
        }
        return true;
      }),

    deliverPending,

    setEnabled: (isEnabled) =>
      inOrder(async () => {
        const previous = await store.loadState();
        const state: WatchState = {
          ...previous,
          isEnabled,
          awaitingReportSince: isEnabled ? previous.awaitingReportSince : null,
          isAwaitingCatchUpPage: isEnabled && previous.isAwaitingCatchUpPage,
        };
        await store.storeState(state);
        await showBadgeFor(state);
      }),

    resume: () =>
      inOrder(async () => {
        const state: WatchState = {
          ...(await store.loadState()),
          attentionReason: null,
          awaitingReportSince: null,
          isAwaitingCatchUpPage: false,
        };
        await store.storeState(state);
        await showBadgeFor(state);
      }),

    syncBadge: () => inOrder(async () => showBadgeFor(await store.loadState())),
  };
}
