import { describe, expect, it } from "vitest";
import {
  buildCaptureExport,
  exportFileName,
  mergeCaptures,
} from "../../src/capture/captureCollection";
import { type CapturedListing, captureExportSchema } from "../../src/capture/capturedListing";

function aCapturedListing(overrides: Partial<CapturedListing> = {}): CapturedListing {
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
    capturedAt: "2026-11-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("mergeCaptures", () => {
  it("keeps one entry per listing with the latest capture", () => {
    const stored = [aCapturedListing({ externalId: "1", monthlyRentUsd: 900 })];
    const incoming = [aCapturedListing({ externalId: "1", monthlyRentUsd: 850 })];

    const merged = mergeCaptures(stored, incoming);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.monthlyRentUsd).toBe(850);
  });

  it("adds new listings after the stored ones", () => {
    const merged = mergeCaptures(
      [aCapturedListing({ externalId: "1" })],
      [aCapturedListing({ externalId: "2" })],
    );

    expect(merged.map((listing) => listing.externalId)).toEqual(["1", "2"]);
  });
});

describe("buildCaptureExport", () => {
  it("produces a file that satisfies the import schema", () => {
    const exported = buildCaptureExport([aCapturedListing()], new Date("2026-11-13T12:00:00Z"));

    expect(captureExportSchema.safeParse(exported).success).toBe(true);
  });

  it("names the file after the export date", () => {
    expect(exportFileName(new Date("2026-11-13T12:00:00Z"))).toBe("depazo-captura-2026-11-13.json");
  });
});
