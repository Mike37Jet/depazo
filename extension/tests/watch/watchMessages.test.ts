import { describe, expect, it } from "vitest";
import {
  buildPageReport,
  buildWatchCommandMessage,
  classifyMessage,
  MAX_REPORTED_LISTINGS,
  type MessageOrigin,
  pageReportSchema,
} from "../../src/watch/watchMessages";
import { WATCH_URL } from "../../src/watch/watchSchedule";
import { aCapturedListing, listingsNumbered } from "./watchFakes";

const EXTENSION_ID = "fabgniffhpmdifgbdlgjchjchgfjcldm";
const POPUP_URL = `chrome-extension://${EXTENSION_ID}/popup/popup.html`;

function contentScriptSender(overrides: Partial<MessageOrigin> = {}): MessageOrigin {
  return { id: EXTENSION_ID, url: WATCH_URL, tab: { id: 7, url: WATCH_URL }, ...overrides };
}

function popupSender(overrides: Partial<MessageOrigin> = {}): MessageOrigin {
  return { id: EXTENSION_ID, url: POPUP_URL, ...overrides };
}

describe("buildPageReport", () => {
  it("builds a report the service worker accepts, also without cards", () => {
    expect(pageReportSchema.safeParse(buildPageReport(0, [])).success).toBe(true);
  });

  it("reports the card count next to the readable listings", () => {
    const report = buildPageReport(30, [aCapturedListing()]);

    expect(report).toEqual({
      type: "pageReport",
      source: "plusvalia",
      cardCount: 30,
      listings: [aCapturedListing()],
    });
  });

  it("never reports more listings than the service worker accepts", () => {
    const report = buildPageReport(300, listingsNumbered(MAX_REPORTED_LISTINGS + 1));

    expect(pageReportSchema.safeParse(report).success).toBe(true);
  });
});

describe("classifyMessage", () => {
  it("accepts a page report sent by the content script on Plusvalía", () => {
    const report = buildPageReport(1, [aCapturedListing()]);

    const classified = classifyMessage(report, contentScriptSender(), EXTENSION_ID);

    expect(classified).toEqual({ kind: "pageReport", report, tabId: 7, documentId: null });
  });

  it("passes on the document that sent the page report", () => {
    const report = buildPageReport(1, [aCapturedListing()]);
    const sender = contentScriptSender({ documentId: "A1B2" });

    const classified = classifyMessage(report, sender, EXTENSION_ID);

    expect(classified).toMatchObject({ kind: "pageReport", documentId: "A1B2" });
  });

  it.each([
    ["another extension", contentScriptSender({ id: "anotherextensionidentifier" })],
    ["a sender without extension id", contentScriptSender({ id: undefined })],
    ["a sender without tab", contentScriptSender({ tab: undefined })],
    ["a tab without identifier", contentScriptSender({ tab: { url: WATCH_URL } })],
    ["a tab without url", contentScriptSender({ tab: { id: 7 } })],
    [
      "a Facebook tab",
      contentScriptSender({
        url: "https://www.facebook.com/marketplace",
        tab: { id: 7, url: "https://www.facebook.com/marketplace" },
      }),
    ],
    [
      "a lookalike host",
      contentScriptSender({ tab: { id: 7, url: "https://www.plusvalia.com.evil.test/alquiler/" } }),
    ],
    [
      "a plain http tab",
      contentScriptSender({ tab: { id: 7, url: "http://www.plusvalia.com/alquiler/" } }),
    ],
    [
      "a frame from another origin inside a Plusvalía tab",
      contentScriptSender({ url: "https://ads.example.test/frame" }),
    ],
  ])("rejects a page report from %s", (_description, sender) => {
    const report = buildPageReport(1, [aCapturedListing()]);

    expect(classifyMessage(report, sender, EXTENSION_ID)).toEqual({ kind: "rejected" });
  });

  it.each([
    ["an unknown message type", { type: "somethingElse" }],
    ["a report for another portal", { ...buildPageReport(0, []), source: "marketplace" }],
    ["a report with an extra field", { ...buildPageReport(0, []), command: "resume" }],
    ["a report without card count", { type: "pageReport", source: "plusvalia", listings: [] }],
    ["a negative card count", { ...buildPageReport(0, []), cardCount: -1 }],
    [
      "a listing from another portal",
      buildPageReport(1, [aCapturedListing({ source: "marketplace" })]),
    ],
    [
      "a listing that links outside Plusvalía",
      buildPageReport(1, [aCapturedListing({ url: "https://evil.test/depa-1.html" })]),
    ],
    [
      "a listing that links to a lookalike host",
      buildPageReport(1, [aCapturedListing({ url: "https://www.plusvalia.com.evil.test/x" })]),
    ],
    [
      "a listing with an unknown field",
      { ...buildPageReport(0, []), listings: [{ ...aCapturedListing(), agentPhone: "0999" }] },
    ],
    [
      "a listing with a malformed identifier",
      { ...buildPageReport(0, []), listings: [{ ...aCapturedListing(), externalId: "1; rm" }] },
    ],
    [
      "too many listings",
      {
        ...buildPageReport(0, []),
        listings: listingsNumbered(MAX_REPORTED_LISTINGS + 1),
      },
    ],
    ["a string", "pageReport"],
    ["nothing", null],
  ])("rejects %s", (_description, message) => {
    expect(classifyMessage(message, contentScriptSender(), EXTENSION_ID)).toEqual({
      kind: "rejected",
    });
  });

  it.each(["enable", "disable", "resume"] as const)(
    "accepts the %s command from the popup",
    (command) => {
      const classified = classifyMessage(
        buildWatchCommandMessage(command),
        popupSender(),
        EXTENSION_ID,
      );

      expect(classified).toEqual({ kind: "watchCommand", command });
    },
  );

  it("does not let a web page resume the watch through its content script", () => {
    const classified = classifyMessage(
      buildWatchCommandMessage("resume"),
      contentScriptSender(),
      EXTENSION_ID,
    );

    expect(classified).toEqual({ kind: "rejected" });
  });

  it.each([
    ["another extension", popupSender({ id: "anotherextensionidentifier" })],
    ["a page of another extension", popupSender({ url: "chrome-extension://other/popup.html" })],
    ["a sender without url", popupSender({ url: undefined })],
  ])("rejects a command from %s", (_description, sender) => {
    const classified = classifyMessage(buildWatchCommandMessage("enable"), sender, EXTENSION_ID);

    expect(classified).toEqual({ kind: "rejected" });
  });

  it("rejects a command the popup does not offer", () => {
    const message = { type: "watchCommand", command: "reloadNow" };

    expect(classifyMessage(message, popupSender(), EXTENSION_ID)).toEqual({ kind: "rejected" });
  });
});
