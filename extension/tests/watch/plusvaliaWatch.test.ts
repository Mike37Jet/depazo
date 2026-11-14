import { describe, expect, it } from "vitest";
import { captureExportSchema } from "../../src/capture/capturedListing";
import type { DeliveryOutcome } from "../../src/watch/nativeDelivery";
import { catchUpPageUrl, LAST_CATCH_UP_PAGE, WATCH_URL } from "../../src/watch/watchSchedule";
import {
  aCapturedListing,
  aPageReport,
  aWatchState,
  DELIVERED,
  deliverWithReply,
  FakeBrowser,
  listingsNumbered,
  MIDMORNING,
  settled,
  WATCH_TAB_ID,
  watchingState,
} from "./watchFakes";

const FAILED_OUTCOMES: readonly DeliveryOutcome[] = [
  { kind: "rejected", error: "invalid_capture" },
  { kind: "rejected", error: "unavailable" },
  { kind: "disconnected" },
  { kind: "timedOut" },
  { kind: "invalidReply" },
];

function localTime(hour: number, minute: number): Date {
  return new Date(2026, 10, 14, hour, minute, 0);
}

describe("watch cycle", () => {
  it("touches no tab while watching is off", async () => {
    const browser = new FakeBrowser(aWatchState({ tabId: WATCH_TAB_ID }));

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("off");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.openedUrls).toEqual([]);
  });

  it.each([
    [6, 59],
    [22, 0],
    [3, 0],
  ])("touches no tab at %i:%i local time", async (hour, minute) => {
    const browser = new FakeBrowser(watchingState());
    browser.now = localTime(hour, minute);

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("outsideActiveHours");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.openedUrls).toEqual([]);
  });

  it.each([
    [7, 0],
    [21, 59],
  ])("reloads the watch tab at %i:%i local time", async (hour, minute) => {
    const browser = new FakeBrowser(watchingState());
    browser.now = localTime(hour, minute);

    await browser.createWatch().runCycle();

    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
  });

  it("touches no tab while the watch needs attention", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("needsAttention");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.openedUrls).toEqual([]);
  });

  it("reloads the stored tab when it is still on the Plusvalía rentals", async () => {
    const browser = new FakeBrowser(watchingState());

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("reload");
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
    expect(browser.openedUrls).toEqual([]);
    expect(browser.state.tabId).toBe(WATCH_TAB_ID);
  });

  it("opens the watched search when the stored tab no longer exists", async () => {
    const browser = new FakeBrowser(watchingState());
    browser.tabUrls.clear();

    await browser.createWatch().runCycle();

    expect(browser.openedUrls).toEqual([WATCH_URL]);
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.state.tabId).toBe(100);
  });

  it("adopts the pinned rentals tab Chrome restored instead of opening another", async () => {
    const browser = new FakeBrowser(watchingState());
    browser.tabUrls.clear();
    browser.tabUrls.set(31, WATCH_URL);
    browser.pinnedRentalTabIds = [31];

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("reload");
    expect(browser.openedUrls).toEqual([]);
    expect(browser.reloadedTabIds).toEqual([31]);
    expect(browser.state.tabId).toBe(31);
  });

  it("counts the reports of the adopted tab", async () => {
    const browser = new FakeBrowser(watchingState());
    browser.tabUrls.clear();
    browser.tabUrls.set(31, WATCH_URL);
    browser.pinnedRentalTabIds = [31];
    const watch = browser.createWatch();
    await watch.runCycle();

    const isAccepted = await watch.acceptPageReport(aPageReport([aCapturedListing()]), 31);

    expect(isAccepted).toBe(true);
  });

  it("keeps reloading the stored tab when another pinned rentals tab exists", async () => {
    const browser = new FakeBrowser(watchingState());
    browser.tabUrls.set(31, WATCH_URL);
    browser.pinnedRentalTabIds = [31];

    await browser.createWatch().runCycle();

    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
    expect(browser.state.tabId).toBe(WATCH_TAB_ID);
  });

  it("opens the watched search when no tab was ever stored", async () => {
    const browser = new FakeBrowser(aWatchState({ isEnabled: true }));

    await browser.createWatch().runCycle();

    expect(browser.openedUrls).toEqual([WATCH_URL]);
    expect(browser.state.tabId).toBe(100);
  });

  it.each([
    "https://www.plusvalia.com/venta/departamentos/quito",
    "https://www.facebook.com/marketplace",
    undefined,
  ])("leaves the stored tab alone and opens a new one when it moved to %s", async (url) => {
    const browser = new FakeBrowser(watchingState());
    browser.tabUrls.set(WATCH_TAB_ID, url);

    await browser.createWatch().runCycle();

    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.openedUrls).toEqual([WATCH_URL]);
    expect(browser.state.tabId).toBe(100);
  });

  it("skips the cycle without changing state when Chrome has no window", async () => {
    const initial = watchingState();
    const browser = new FakeBrowser(initial);
    browser.tabUrls.clear();
    browser.hasWindow = false;

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("noWindow");
    expect(browser.openedUrls).toEqual([]);
    expect(browser.state).toEqual(initial);
    expect(browser.reportDeadlines).toEqual([]);
  });

  it("skips the cycle without reloading or stopping while the computer is offline", async () => {
    const initial = watchingState();
    const browser = new FakeBrowser(initial);
    browser.isOnline = false;

    const outcome = await browser.createWatch().runCycle();

    expect(outcome).toBe("offline");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.state).toEqual(initial);
    expect(browser.reportDeadlines).toEqual([]);
  });

  it("sets a one-minute deadline for the report after each reload", async () => {
    const browser = new FakeBrowser(watchingState());

    await browser.createWatch().runCycle();

    expect(browser.reportDeadlines).toEqual([new Date(MIDMORNING.getTime() + 60_000)]);
    expect(browser.state.awaitingReportSince).toBe(MIDMORNING.toISOString());
  });

  it("does not reload again while the previous reload still awaits its report", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(30);

    const outcome = await watch.runCycle();

    expect(outcome).toBe("awaitingReport");
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
  });
});

describe("stop rule", () => {
  it("stops and shows the badge when the deadline passes without a report", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.state.awaitingReportSince).toBeNull();
    expect(browser.isBadgeShown).toBe(true);
  });

  it("stops when the page reported no cards at all", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    const isAccepted = await watch.acceptPageReport(aPageReport([]), WATCH_TAB_ID);
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(isAccepted).toBe(false);
    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.state.lastCheckAt).toBeNull();
  });

  it("keeps watching when a readable report arrives before the deadline", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(3);
    const reportedAt = browser.now;
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID);
    browser.advanceSeconds(57);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBeNull();
    expect(browser.state.lastCheckAt).toBe(reportedAt.toISOString());
    expect(browser.isBadgeShown).toBe(false);
  });

  it("keeps watching when the first report is empty and a later one is readable", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([]), WATCH_TAB_ID);
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID);
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBeNull();
  });

  it("does not count a report from a tab the owner browses by hand", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    const isAccepted = await watch.acceptPageReport(aPageReport([aCapturedListing()]), 55);
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(isAccepted).toBe(false);
    expect(browser.pendingListings).toEqual([]);
    expect(browser.state.attentionReason).toBe("noReport");
  });

  it("waits for the full minute when the deadline alarm fires early", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(20);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBeNull();
    expect(browser.reportDeadlines.at(-1)).toEqual(new Date(MIDMORNING.getTime() + 60_000));
  });

  it("stops at the next cycle when the deadline alarm was lost", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(20 * 60);

    const outcome = await watch.runCycle();

    expect(outcome).toBe("reportOverdue");
    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
  });

  it("never resumes by itself, not even when the watch tab loads fine again", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));
    const watch = browser.createWatch();

    const isAccepted = await watch.acceptPageReport(
      aPageReport([aCapturedListing()]),
      WATCH_TAB_ID,
    );
    for (let cycle = 0; cycle < 12; cycle += 1) {
      browser.advanceSeconds(20 * 60);
      await watch.runCycle();
    }

    expect(isAccepted).toBe(false);
    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.openedUrls).toEqual([]);
    expect(browser.pendingListings).toEqual([]);
  });

  it("stays stopped when the owner turns the watch off and on again", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));
    const watch = browser.createWatch();

    await watch.setEnabled(false);
    await watch.setEnabled(true);
    await watch.runCycle();

    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.reloadedTabIds).toEqual([]);
    expect(browser.isBadgeShown).toBe(true);
  });

  it("reloads again only after the owner resumes", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));
    browser.isBadgeShown = true;
    const watch = browser.createWatch();

    await watch.resume();
    await watch.runCycle();

    expect(browser.state.attentionReason).toBeNull();
    expect(browser.isBadgeShown).toBe(false);
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
  });

  it("restores the badge after the browser restarts while stopped", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));

    await browser.createWatch().syncBadge();

    expect(browser.isBadgeShown).toBe(true);
  });

  it("hides the badge while watching is off", async () => {
    const browser = new FakeBrowser(watchingState({ attentionReason: "noReport" }));
    browser.isBadgeShown = true;

    await browser.createWatch().setEnabled(false);

    expect(browser.isBadgeShown).toBe(false);
    expect(browser.state.attentionReason).toBe("noReport");
  });

  it("does not reload again when the owner turns the watch off and on within the minute", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.advanceSeconds(10);
    await watch.setEnabled(false);
    await watch.setEnabled(true);

    const outcome = await watch.runCycle();

    expect(outcome).toBe("reloadedRecently");
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID]);
    expect(browser.openedUrls).toEqual([]);
  });

  it("reloads again once a minute has passed since the last reload", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.setEnabled(false);
    await watch.setEnabled(true);
    browser.advanceSeconds(60);

    const outcome = await watch.runCycle();

    expect(outcome).toBe("reload");
    expect(browser.reloadedTabIds).toEqual([WATCH_TAB_ID, WATCH_TAB_ID]);
  });

  it("does not count a report from the document that was open before the reload", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "before");
    await watch.runCycle();
    const isAccepted = await watch.acceptPageReport(
      aPageReport([aCapturedListing({ externalId: "2" })]),
      WATCH_TAB_ID,
      "before",
    );
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(isAccepted).toBe(false);
    expect(browser.state.attentionReason).toBe("noReport");
  });

  it("counts the report of the document the reload loaded", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "before");
    await watch.runCycle();
    const isAccepted = await watch.acceptPageReport(
      aPageReport([aCapturedListing({ externalId: "2" })]),
      WATCH_TAB_ID,
      "after",
    );
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(isAccepted).toBe(true);
    expect(browser.state.attentionReason).toBeNull();
    expect(browser.state.lastReportDocumentId).toBe("after");
  });

  it("forgets a pending deadline when the owner turns the watch off", async () => {
    const browser = new FakeBrowser(watchingState());
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.setEnabled(false);
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBeNull();
  });
});

describe("delivery", () => {
  async function browserWithPending(listings = [aCapturedListing()]): Promise<FakeBrowser> {
    const browser = new FakeBrowser(watchingState());
    await browser.createWatch().acceptPageReport(aPageReport(listings), WATCH_TAB_ID);
    return browser;
  }

  it("sends the reported listings in the capture envelope the backend imports", async () => {
    const browser = await browserWithPending();

    await deliverWithReply(browser, browser.createWatch(), DELIVERED);

    expect(browser.sentCaptures).toHaveLength(1);
    expect(captureExportSchema.safeParse(browser.sentCaptures[0]).success).toBe(true);
    expect(browser.sentCaptures[0]).toMatchObject({
      format: "depazo.capture",
      version: 1,
      exportedAt: MIDMORNING.toISOString(),
      listings: [aCapturedListing()],
    });
  });

  it("marks the listings as delivered once the host confirms", async () => {
    const browser = await browserWithPending();

    await deliverWithReply(browser, browser.createWatch(), DELIVERED);

    expect(browser.deliveredKeys).toEqual(["1:900:null"]);
    expect(browser.pendingListings).toEqual([]);
    expect(browser.state.lastDelivery).toEqual({
      at: MIDMORNING.toISOString(),
      outcome: DELIVERED,
    });
  });

  it("does not send a listing again when it is reported with the same price", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    await deliverWithReply(browser, watch, DELIVERED);
    browser.advanceSeconds(20 * 60);
    await watch.acceptPageReport(
      aPageReport([aCapturedListing({ capturedAt: "2026-11-14T15:20:00.000Z" })]),
      WATCH_TAB_ID,
    );

    await watch.deliverPending();

    expect(browser.sentCaptures).toHaveLength(1);
  });

  it.each([[{ monthlyRentUsd: 850 }], [{ condoFeeUsd: 70 }]])(
    "sends a delivered listing again when its price changes to %o",
    async (change) => {
      const browser = await browserWithPending();
      const watch = browser.createWatch();
      await deliverWithReply(browser, watch, DELIVERED);
      browser.advanceSeconds(20 * 60);
      await watch.acceptPageReport(aPageReport([aCapturedListing(change)]), WATCH_TAB_ID);

      await deliverWithReply(browser, watch, DELIVERED);

      expect(browser.sentCaptures).toHaveLength(2);
      expect(browser.sentCaptures[1]?.listings).toEqual([aCapturedListing(change)]);
    },
  );

  it("sends at most one hundred listings per message and schedules the rest", async () => {
    const browser = await browserWithPending(listingsNumbered(150));

    await deliverWithReply(browser, browser.createWatch(), DELIVERED);

    expect(browser.sentCaptures[0]?.listings).toHaveLength(100);
    expect(browser.pendingListings).toHaveLength(50);
    expect(browser.deliveryAlarms).toEqual([new Date(MIDMORNING.getTime() + 60_000)]);
  });

  it("keeps a single delivery in flight", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    const firstDelivery = watch.deliverPending();
    await settled();

    await watch.deliverPending();
    browser.deliveries[0]?.reply(DELIVERED);
    await firstDelivery;

    expect(browser.sentCaptures).toHaveLength(1);
  });

  it("waits sixty seconds between deliveries", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    await deliverWithReply(browser, watch, DELIVERED);
    await watch.acceptPageReport(
      aPageReport([aCapturedListing({ externalId: "2" })]),
      WATCH_TAB_ID,
    );
    browser.advanceSeconds(59);

    await watch.deliverPending();

    expect(browser.sentCaptures).toHaveLength(1);
    expect(browser.deliveryAlarms).toEqual([new Date(MIDMORNING.getTime() + 60_000)]);
  });

  it("delivers the waiting listings once the sixty seconds have passed", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    await deliverWithReply(browser, watch, DELIVERED);
    await watch.acceptPageReport(
      aPageReport([aCapturedListing({ externalId: "2" })]),
      WATCH_TAB_ID,
    );
    browser.advanceSeconds(60);

    await deliverWithReply(browser, watch, DELIVERED);

    expect(browser.sentExternalIds).toEqual([["1"], ["2"]]);
  });

  it("measures the sixty seconds from the end of a slow delivery", async () => {
    const browser = await browserWithPending(listingsNumbered(101));
    const watch = browser.createWatch();
    const slowDelivery = watch.deliverPending();
    await settled();
    browser.advanceSeconds(200);
    browser.deliveries[0]?.reply(DELIVERED);
    await slowDelivery;
    browser.advanceSeconds(30);

    await watch.deliverPending();

    expect(browser.sentCaptures).toHaveLength(1);
  });

  it.each(FAILED_OUTCOMES)("leaves the listings pending after the outcome %o", async (outcome) => {
    const browser = await browserWithPending();

    await deliverWithReply(browser, browser.createWatch(), outcome);

    expect(browser.deliveredKeys).toEqual([]);
    expect(browser.pendingListings).toEqual([aCapturedListing()]);
    expect(browser.state.lastDelivery).toEqual({ at: MIDMORNING.toISOString(), outcome });
    expect(browser.deliveryAlarms).toEqual([]);
  });

  it("retries the pending listings in a later cycle after a failure", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    await deliverWithReply(browser, watch, { kind: "disconnected" });
    browser.advanceSeconds(20 * 60);

    await deliverWithReply(browser, watch, DELIVERED);

    expect(browser.sentExternalIds).toEqual([["1"], ["1"]]);
    expect(browser.deliveredKeys).toEqual(["1:900:null"]);
  });

  it("keeps a listing pending when its price changed while it was being delivered", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    const repriced = aCapturedListing({ monthlyRentUsd: 850 });
    const delivering = watch.deliverPending();
    await settled();
    await watch.acceptPageReport(aPageReport([repriced]), WATCH_TAB_ID);

    browser.deliveries[0]?.reply(DELIVERED);
    await delivering;

    expect(browser.pendingListings).toEqual([repriced]);
    expect(browser.deliveredKeys).toEqual(["1:900:null"]);
  });

  it("delivers nothing while watching is off", async () => {
    const browser = await browserWithPending();
    const watch = browser.createWatch();
    await watch.setEnabled(false);

    await watch.deliverPending();

    expect(browser.sentCaptures).toEqual([]);
    expect(browser.pendingListings).toEqual([aCapturedListing()]);
  });

  it("contacts the host only when there is something new to deliver", async () => {
    const browser = new FakeBrowser(watchingState());

    await browser.createWatch().deliverPending();

    expect(browser.sentCaptures).toEqual([]);
    expect(browser.state.lastDeliveryAttemptAt).toBeNull();
  });
});

describe("catch-up with earlier listings", () => {
  it("opens one earlier page after the newest listings were read", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();

    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");

    expect(browser.shownUrls).toEqual([catchUpPageUrl(2)]);
    expect(browser.state.isAwaitingCatchUpPage).toBe(true);
    expect(browser.state.awaitingReportSince).toBe(MIDMORNING.toISOString());
    expect(browser.reportDeadlines).toHaveLength(2);
  });

  it("moves on to the next page once the earlier page was read", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");

    await watch.acceptPageReport(
      aPageReport([aCapturedListing({ externalId: "2" })]),
      WATCH_TAB_ID,
      "earlier",
    );

    expect(browser.state.nextCatchUpPage).toBe(3);
    expect(browser.state.isAwaitingCatchUpPage).toBe(false);
    expect(browser.state.awaitingReportSince).toBeNull();
    expect(browser.shownUrls).toEqual([catchUpPageUrl(2)]);
    expect(browser.pendingListings.map((listing) => listing.externalId)).toEqual(["1", "2"]);
  });

  it("opens only one earlier page per cycle however many reports the page sends", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "earlier");

    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "earlier");

    expect(browser.shownUrls).toEqual([catchUpPageUrl(2)]);
    expect(browser.state.nextCatchUpPage).toBe(3);
  });

  it("ignores a late report of the newest page while the earlier page loads", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");

    const isAccepted = await watch.acceptPageReport(
      aPageReport([aCapturedListing()]),
      WATCH_TAB_ID,
      "newest",
    );

    expect(isAccepted).toBe(false);
    expect(browser.state.nextCatchUpPage).toBe(2);
    expect(browser.state.isAwaitingCatchUpPage).toBe(true);
  });

  it("returns to the newest listings on the next cycle", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "earlier");
    browser.advanceSeconds(20 * 60);

    await watch.runCycle();

    expect(browser.shownUrls).toEqual([catchUpPageUrl(2), WATCH_URL]);
    expect(browser.state.isAwaitingCatchUpPage).toBe(false);
  });

  it("stops for good when the earlier page never reports", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");
    browser.advanceSeconds(60);

    await watch.enforceReportDeadline();

    expect(browser.state.attentionReason).toBe("noReport");
    expect(browser.state.isAwaitingCatchUpPage).toBe(false);
    expect(browser.state.nextCatchUpPage).toBe(2);
    expect(browser.isBadgeShown).toBe(true);
  });

  it("opens no earlier page once the last one was read", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: LAST_CATCH_UP_PAGE + 1 }));
    const watch = browser.createWatch();
    await watch.runCycle();

    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");

    expect(browser.shownUrls).toEqual([]);
    expect(browser.state.awaitingReportSince).toBeNull();
  });

  it("opens no earlier page while the computer is offline", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));
    const watch = browser.createWatch();
    await watch.runCycle();
    browser.isOnline = false;

    await watch.acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "newest");

    expect(browser.shownUrls).toEqual([]);
    expect(browser.state.nextCatchUpPage).toBe(2);
  });

  it("opens no earlier page for a page the owner browsed by hand", async () => {
    const browser = new FakeBrowser(watchingState({ nextCatchUpPage: 2 }));

    await browser
      .createWatch()
      .acceptPageReport(aPageReport([aCapturedListing()]), WATCH_TAB_ID, "byHand");

    expect(browser.shownUrls).toEqual([]);
  });
});
