import * as z from "zod/mini";
import { type CapturedListing, capturedListingSchema } from "../capture/capturedListing";
import { PLUSVALIA_ORIGIN } from "../sources/plusvalia/parsePlusvaliaPage";

export const PAGE_REPORT_TYPE = "pageReport";
export const WATCH_COMMAND_TYPE = "watchCommand";
export const MAX_REPORTED_LISTINGS = 200;
export const WATCH_COMMANDS = ["enable", "disable", "resume"] as const;

const MAX_REPORTED_CARDS = 1000;
const PLUSVALIA_LISTING_URL_PREFIX = `${PLUSVALIA_ORIGIN}/`;

export type WatchCommand = (typeof WATCH_COMMANDS)[number];

const reportedListingSchema = capturedListingSchema.check(
  z.refine(
    (listing) =>
      listing.source === "plusvalia" && listing.url.startsWith(PLUSVALIA_LISTING_URL_PREFIX),
  ),
);

export const pageReportSchema = z.strictObject({
  type: z.literal(PAGE_REPORT_TYPE),
  source: z.literal("plusvalia"),
  cardCount: z.int().check(z.nonnegative(), z.lte(MAX_REPORTED_CARDS)),
  listings: z.array(reportedListingSchema).check(z.maxLength(MAX_REPORTED_LISTINGS)),
});

export type PageReport = z.infer<typeof pageReportSchema>;

export const watchCommandMessageSchema = z.strictObject({
  type: z.literal(WATCH_COMMAND_TYPE),
  command: z.enum(WATCH_COMMANDS),
});

export const watchCommandReplySchema = z.object({ isHandled: z.literal(true) });

export type WatchCommandMessage = z.infer<typeof watchCommandMessageSchema>;

export interface MessageOrigin {
  id?: string | undefined;
  url?: string | undefined;
  documentId?: string | undefined;
  tab?: { id?: number | undefined; url?: string | undefined } | undefined;
}

export type ClassifiedMessage =
  | { kind: "pageReport"; report: PageReport; tabId: number; documentId: string | null }
  | { kind: "watchCommand"; command: WatchCommand }
  | { kind: "rejected" };

const REJECTED: ClassifiedMessage = { kind: "rejected" };

export function buildPageReport(
  cardCount: number,
  listings: readonly CapturedListing[],
): PageReport {
  return {
    type: PAGE_REPORT_TYPE,
    source: "plusvalia",
    cardCount: Math.min(cardCount, MAX_REPORTED_CARDS),
    listings: listings.slice(0, MAX_REPORTED_LISTINGS),
  };
}

export function buildWatchCommandMessage(command: WatchCommand): WatchCommandMessage {
  return { type: WATCH_COMMAND_TYPE, command };
}

function isOnPlusvaliaOrigin(url: string | undefined): boolean {
  return url !== undefined && URL.canParse(url) && new URL(url).origin === PLUSVALIA_ORIGIN;
}

function plusvaliaTabIdOf(sender: MessageOrigin): number | null {
  const tabId = sender.tab?.id;
  if (tabId === undefined || !isOnPlusvaliaOrigin(sender.tab?.url)) {
    return null;
  }
  if (sender.url !== undefined && !isOnPlusvaliaOrigin(sender.url)) {
    return null;
  }
  return tabId;
}

function isExtensionPage(sender: MessageOrigin, extensionId: string): boolean {
  return (
    sender.tab === undefined &&
    sender.url !== undefined &&
    sender.url.startsWith(`chrome-extension://${extensionId}/`)
  );
}

export function classifyMessage(
  message: unknown,
  sender: MessageOrigin,
  extensionId: string,
): ClassifiedMessage {
  if (sender.id !== extensionId) {
    return REJECTED;
  }
  const command = watchCommandMessageSchema.safeParse(message);
  if (command.success) {
    return isExtensionPage(sender, extensionId)
      ? { kind: "watchCommand", command: command.data.command }
      : REJECTED;
  }
  const report = pageReportSchema.safeParse(message);
  const tabId = plusvaliaTabIdOf(sender);
  if (!report.success || tabId === null) {
    return REJECTED;
  }
  return {
    kind: "pageReport",
    report: report.data,
    tabId,
    documentId: sender.documentId ?? null,
  };
}
