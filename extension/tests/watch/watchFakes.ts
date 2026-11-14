import type { CapturedListing, CaptureExport } from "../../src/capture/capturedListing";
import type { DeliveryOutcome } from "../../src/watch/nativeDelivery";
import { createPlusvaliaWatch, type PlusvaliaWatch } from "../../src/watch/plusvaliaWatch";
import { buildPageReport, type PageReport } from "../../src/watch/watchMessages";
import { LAST_CATCH_UP_PAGE, WATCH_URL } from "../../src/watch/watchSchedule";
import { DEFAULT_WATCH_STATE, type WatchState } from "../../src/watch/watchState";

export const WATCH_TAB_ID = 7;
export const MIDMORNING = new Date(2026, 10, 14, 10, 0, 0);

export function aCapturedListing(overrides: Partial<CapturedListing> = {}): CapturedListing {
  return {
    source: "plusvalia",
    externalId: "1",
    url: "https://www.plusvalia.com/propiedades/clasificado/depa-1.html",
    title: "Departamento en La Carolina",
    monthlyRentUsd: 900,
    condoFeeUsd: null,
    areaM2: 80,
    bedrooms: 2,
    bathrooms: 2,
    neighborhood: "La Carolina",
    city: "Quito",
    imageUrl: null,
    capturedAt: "2026-11-14T15:00:00.000Z",
    ...overrides,
  };
}

export function listingsNumbered(count: number): CapturedListing[] {
  return Array.from({ length: count }, (_, index) =>
    aCapturedListing({ externalId: String(index + 1) }),
  );
}

export function aPageReport(listings: readonly CapturedListing[]): PageReport {
  return buildPageReport(listings.length, listings);
}

export function aWatchState(overrides: Partial<WatchState> = {}): WatchState {
  return { ...DEFAULT_WATCH_STATE, nextCatchUpPage: LAST_CATCH_UP_PAGE + 1, ...overrides };
}

export function watchingState(overrides: Partial<WatchState> = {}): WatchState {
  return aWatchState({ isEnabled: true, tabId: WATCH_TAB_ID, ...overrides });
}

export interface PendingDelivery {
  capture: CaptureExport;
  reply(outcome: DeliveryOutcome): void;
}

export class FakeBrowser {
  now = MIDMORNING;
  state: WatchState;
  pendingListings: CapturedListing[] = [];
  deliveredKeys: string[] = [];
  tabUrls = new Map<number, string | undefined>([[WATCH_TAB_ID, WATCH_URL]]);
  pinnedRentalTabIds: number[] = [];
  hasWindow = true;
  isOnline = true;
  nextTabId = 100;
  reloadedTabIds: number[] = [];
  shownUrls: string[] = [];
  openedUrls: string[] = [];
  reportDeadlines: Date[] = [];
  deliveryAlarms: Date[] = [];
  isBadgeShown = false;
  deliveries: PendingDelivery[] = [];

  constructor(state: WatchState) {
    this.state = state;
  }

  advanceSeconds(seconds: number): void {
    this.now = new Date(this.now.getTime() + seconds * 1000);
  }

  get sentCaptures(): CaptureExport[] {
    return this.deliveries.map((delivery) => delivery.capture);
  }

  get sentExternalIds(): string[][] {
    return this.sentCaptures.map((capture) =>
      capture.listings.map((listing) => listing.externalId),
    );
  }

  createWatch(): PlusvaliaWatch {
    return createPlusvaliaWatch({
      now: () => this.now,
      isOnline: () => this.isOnline,
      store: {
        loadState: async () => this.state,
        storeState: async (state) => {
          this.state = state;
        },
        loadPendingListings: async () => this.pendingListings,
        storePendingListings: async (listings) => {
          this.pendingListings = [...listings];
        },
        loadDeliveredKeys: async () => this.deliveredKeys,
        storeDeliveredKeys: async (keys) => {
          this.deliveredKeys = [...keys];
        },
      },
      tabs: {
        find: async (tabId) =>
          this.tabUrls.has(tabId) ? { id: tabId, url: this.tabUrls.get(tabId) } : null,
        findExisting: async () => {
          const tabId = this.pinnedRentalTabIds.find((pinned) => this.tabUrls.has(pinned));
          return tabId === undefined ? null : { id: tabId, url: this.tabUrls.get(tabId) };
        },
        hasWindow: async () => this.hasWindow,
        open: async (url) => {
          const tabId = this.nextTabId;
          this.nextTabId += 1;
          this.tabUrls.set(tabId, url);
          this.openedUrls.push(url);
          return tabId;
        },
        reload: async (tabId) => {
          this.reloadedTabIds.push(tabId);
        },
        show: async (tabId, url) => {
          this.tabUrls.set(tabId, url);
          this.shownUrls.push(url);
        },
      },
      alarms: {
        scheduleReportDeadline: async (at) => {
          this.reportDeadlines.push(at);
        },
        scheduleDelivery: async (at) => {
          this.deliveryAlarms.push(at);
        },
      },
      badge: {
        show: async () => {
          this.isBadgeShown = true;
        },
        clear: async () => {
          this.isBadgeShown = false;
        },
      },
      deliverCapture: (capture) =>
        new Promise((resolve) => {
          this.deliveries.push({ capture, reply: resolve });
        }),
    });
  }
}

export const DELIVERED: DeliveryOutcome = {
  kind: "delivered",
  newCount: 1,
  repricedCount: 0,
  unchangedCount: 0,
};

export async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function deliverWithReply(
  browser: FakeBrowser,
  watch: PlusvaliaWatch,
  outcome: DeliveryOutcome,
): Promise<void> {
  const sentBefore = browser.deliveries.length;
  const delivering = watch.deliverPending();
  await settled();
  browser.deliveries[sentBefore]?.reply(outcome);
  await delivering;
}
