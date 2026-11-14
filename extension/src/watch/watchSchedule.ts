import { needsAttention, type WatchState } from "./watchState";

export const WATCH_URL =
  "https://www.plusvalia.com/alquiler/departamentos/pichincha/quito?sort=more_recent";
export const WATCH_TAB_URL_PREFIX = "https://www.plusvalia.com/alquiler/";
export const WATCH_PERIOD_MINUTES = 20;
export const ACTIVE_FROM_HOUR = 7;
export const ACTIVE_UNTIL_HOUR = 22;
export const REPORT_DEADLINE_MILLISECONDS = 60 * 1000;
export const FIRST_CATCH_UP_PAGE = 2;
export const LAST_CATCH_UP_PAGE = 20;

export type WatchCycleDecision =
  | "off"
  | "needsAttention"
  | "awaitingReport"
  | "reportOverdue"
  | "outsideActiveHours"
  | "reloadedRecently"
  | "reload";

export function isWithinActiveHours(now: Date): boolean {
  const hour = now.getHours();
  return hour >= ACTIVE_FROM_HOUR && hour < ACTIVE_UNTIL_HOUR;
}

export function isWatchTabUrl(url: string | undefined): boolean {
  return url?.startsWith(WATCH_TAB_URL_PREFIX) ?? false;
}

export function catchUpPageUrl(page: number): string {
  return `${WATCH_URL}&page=${page}`;
}

export function hasCatchUpPagesLeft(state: WatchState): boolean {
  return state.nextCatchUpPage <= LAST_CATCH_UP_PAGE;
}

export function reportDeadline(awaitingReportSince: string): Date {
  return new Date(new Date(awaitingReportSince).getTime() + REPORT_DEADLINE_MILLISECONDS);
}

export function isReportOverdue(state: WatchState, now: Date): boolean {
  return (
    state.awaitingReportSince !== null &&
    now.getTime() >= reportDeadline(state.awaitingReportSince).getTime()
  );
}

export function hasReloadedRecently(state: WatchState, now: Date): boolean {
  return (
    state.lastReloadAt !== null &&
    now.getTime() < new Date(state.lastReloadAt).getTime() + REPORT_DEADLINE_MILLISECONDS
  );
}

export function decideWatchCycle(state: WatchState, now: Date): WatchCycleDecision {
  if (!state.isEnabled) {
    return "off";
  }
  if (needsAttention(state)) {
    return "needsAttention";
  }
  if (state.awaitingReportSince !== null) {
    return isReportOverdue(state, now) ? "reportOverdue" : "awaitingReport";
  }
  if (!isWithinActiveHours(now)) {
    return "outsideActiveHours";
  }
  return hasReloadedRecently(state, now) ? "reloadedRecently" : "reload";
}
