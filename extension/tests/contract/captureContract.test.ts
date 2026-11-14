import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captureExportSchema } from "../../src/capture/capturedListing";
import { parseMarketplacePage } from "../../src/sources/marketplace/parseMarketplacePage";
import { parsePlusvaliaPage } from "../../src/sources/plusvalia/parsePlusvaliaPage";

const BACKEND_CAPTURE_PATH = join(
  import.meta.dirname,
  "../../../backend/tests/fixtures/capture/browser_capture.json",
);
const MARKETPLACE_PAGE_PATH = join(
  import.meta.dirname,
  "../fixtures/marketplace/quito_rentals.html",
);
const PLUSVALIA_PAGE_PATH = join(import.meta.dirname, "../fixtures/plusvalia/quito_page.html");

function documentAt(path: string): Document {
  return new DOMParser().parseFromString(readFileSync(path, "utf8"), "text/html");
}

function backendCapture(): unknown {
  return JSON.parse(readFileSync(BACKEND_CAPTURE_PATH, "utf8"));
}

describe("capture file contract with the backend importer", () => {
  it("accepts the capture the backend tests import", () => {
    expect(captureExportSchema.safeParse(backendCapture()).success).toBe(true);
  });

  it("parses the page into the same record the backend imports", () => {
    const page = new DOMParser().parseFromString(
      readFileSync(PLUSVALIA_PAGE_PATH, "utf8"),
      "text/html",
    );
    const capture = captureExportSchema.parse(backendCapture());

    const [firstListing] = parsePlusvaliaPage(page, new Date(capture.listings[0]?.capturedAt ?? 0));

    expect(firstListing).toEqual(capture.listings[0]);
  });

  it("parses a marketplace card into the same record the backend imports", () => {
    const capture = captureExportSchema.parse(backendCapture());
    const expected = capture.listings.find((listing) => listing.source === "marketplace");

    const parsed = parseMarketplacePage(
      documentAt(MARKETPLACE_PAGE_PATH),
      new Date(expected?.capturedAt ?? 0),
    );

    expect(parsed.find((listing) => listing.externalId === expected?.externalId)).toEqual(expected);
  });
});
