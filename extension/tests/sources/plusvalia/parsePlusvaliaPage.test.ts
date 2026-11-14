import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { CapturedListing } from "../../../src/capture/capturedListing";
import {
  parsePlusvaliaPage,
  parseSpanishNumber,
} from "../../../src/sources/plusvalia/parsePlusvaliaPage";

const CAPTURED_AT = new Date("2026-11-13T12:00:00.000Z");
const FIXTURE_PATH = join(import.meta.dirname, "../../fixtures/plusvalia/quito_page.html");

function documentFrom(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("parsePlusvaliaPage", () => {
  let listings: CapturedListing[];

  beforeAll(() => {
    listings = parsePlusvaliaPage(documentFrom(readFileSync(FIXTURE_PATH, "utf8")), CAPTURED_AT);
  });

  it("parses every listing card on the page", () => {
    expect(listings).toHaveLength(4);
    expect(listings.every((listing) => listing.source === "plusvalia")).toBe(true);
  });

  it("parses price, condo fee, rooms and locality", () => {
    expect(listings[0]).toEqual({
      source: "plusvalia",
      externalId: "151448881",
      url: "https://www.plusvalia.com/propiedades/clasificado/alclapin-sector-republica-del-salvador.-departamento-amoblado-151448881.html",
      title: "Sector República del Salvador. Departamento Amoblado en Renta, 2d.95 m con Balcón",
      monthlyRentUsd: 1100,
      condoFeeUsd: 1,
      areaM2: 102,
      bedrooms: 2,
      bathrooms: 2,
      neighborhood: "La Carolina",
      city: "Quito",
      imageUrl: "https://img10.naventcdn.com/avisos/9/01/51/44/88/81/360x266/1639505337.jpg",
      capturedAt: "2026-11-13T12:00:00.000Z",
    });
  });

  it("leaves condo fee empty when the card does not show it", () => {
    expect(listings[1]?.condoFeeUsd).toBeNull();
  });

  it("leaves bedrooms empty when the card does not show them", () => {
    expect(listings[2]?.bedrooms).toBeNull();
    expect(listings[2]?.bathrooms).toBe(2);
  });

  it("ignores areas published in hectares", () => {
    expect(listings[3]?.areaM2).toBeNull();
  });

  it("removes tracking parameters from listing urls", () => {
    expect(listings.every((listing) => !listing.url.includes("?"))).toBe(true);
  });

  it("returns no listings for a page without cards", () => {
    expect(parsePlusvaliaPage(documentFrom("<p>Sin resultados</p>"), CAPTURED_AT)).toEqual([]);
  });

  it("skips cards without an identifier", () => {
    const html = '<div data-qa="posting PROPERTY" data-to-posting="/propiedades/x.html"></div>';

    expect(parsePlusvaliaPage(documentFrom(html), CAPTURED_AT)).toEqual([]);
  });

  it("drops images served from unexpected hosts", () => {
    const html = `<div data-qa="posting PROPERTY" data-id="1" data-to-posting="/propiedades/x-1.html">
      <div data-qa="POSTING_CARD_GALLERY"><img alt="Depa" src="https://evil.test/a.jpg"></div></div>`;

    expect(parsePlusvaliaPage(documentFrom(html), CAPTURED_AT)[0]?.imageUrl).toBeNull();
  });
});

describe("parseSpanishNumber", () => {
  it.each([
    ["1.100", 1100],
    ["301,4", 301.4],
    ["5454", 5454],
    ["consultar", null],
  ])("parses %s as %s", (text, expected) => {
    expect(parseSpanishNumber(text)).toBe(expected);
  });
});
