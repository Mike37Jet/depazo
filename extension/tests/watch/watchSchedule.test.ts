import { describe, expect, it } from "vitest";
import {
  decideWatchCycle,
  isWatchTabUrl,
  isWithinActiveHours,
  WATCH_URL,
} from "../../src/watch/watchSchedule";
import { aWatchState, MIDMORNING } from "./watchFakes";

function localTime(hour: number, minute: number): Date {
  return new Date(2026, 10, 14, hour, minute, 0);
}

describe("isWithinActiveHours", () => {
  it.each([
    [6, 59, false],
    [7, 0, true],
    [21, 59, true],
    [22, 0, false],
    [0, 0, false],
  ])("at %i:%i local time answers %s", (hour, minute, expected) => {
    expect(isWithinActiveHours(localTime(hour, minute))).toBe(expected);
  });
});

describe("isWatchTabUrl", () => {
  it("accepts the watched search", () => {
    expect(isWatchTabUrl(WATCH_URL)).toBe(true);
  });

  it.each([
    undefined,
    "https://www.plusvalia.com/venta/departamentos",
    "https://www.plusvalia.com.evil.test/alquiler/",
    "https://evil.test/?next=https://www.plusvalia.com/alquiler/",
  ])("rejects %s", (url) => {
    expect(isWatchTabUrl(url)).toBe(false);
  });
});

describe("decideWatchCycle", () => {
  it("does nothing while watching is off", () => {
    expect(decideWatchCycle(aWatchState(), MIDMORNING)).toBe("off");
  });

  it("reloads while watching is on within the active hours", () => {
    expect(decideWatchCycle(aWatchState({ isEnabled: true }), MIDMORNING)).toBe("reload");
  });

  it("waits outside the active hours", () => {
    const decision = decideWatchCycle(aWatchState({ isEnabled: true }), localTime(23, 30));

    expect(decision).toBe("outsideActiveHours");
  });

  it("stays stopped while the watch needs attention", () => {
    const state = aWatchState({ isEnabled: true, attentionReason: "noReport" });

    expect(decideWatchCycle(state, MIDMORNING)).toBe("needsAttention");
  });

  it("does not reload again while the last reload is still awaiting its report", () => {
    const state = aWatchState({
      isEnabled: true,
      awaitingReportSince: new Date(MIDMORNING.getTime() - 30_000).toISOString(),
    });

    expect(decideWatchCycle(state, MIDMORNING)).toBe("awaitingReport");
  });

  it("does not reload within a minute of the last reload", () => {
    const state = aWatchState({
      isEnabled: true,
      lastReloadAt: new Date(MIDMORNING.getTime() - 59_000).toISOString(),
    });

    expect(decideWatchCycle(state, MIDMORNING)).toBe("reloadedRecently");
  });

  it("reloads once a minute has passed since the last reload", () => {
    const state = aWatchState({
      isEnabled: true,
      lastReloadAt: new Date(MIDMORNING.getTime() - 60_000).toISOString(),
    });

    expect(decideWatchCycle(state, MIDMORNING)).toBe("reload");
  });

  it("flags a reload whose report never arrived, even outside the active hours", () => {
    const night = localTime(23, 0);
    const state = aWatchState({
      isEnabled: true,
      awaitingReportSince: new Date(night.getTime() - 60_000).toISOString(),
    });

    expect(decideWatchCycle(state, night)).toBe("reportOverdue");
  });
});
