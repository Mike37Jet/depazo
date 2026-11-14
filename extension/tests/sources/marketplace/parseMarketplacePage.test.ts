import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { CapturedListing } from "../../../src/capture/capturedListing";
import {
  isMarketplaceRentalsPage,
  parseMarketplacePage,
} from "../../../src/sources/marketplace/parseMarketplacePage";

const CAPTURED_AT = new Date("2026-11-13T12:00:00.000Z");
const FIXTURE_PATH = join(import.meta.dirname, "../../fixtures/marketplace/quito_rentals.html");

function documentFrom(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function cardHtml(id: string, texts: readonly string[]): string {
  const spans = texts.map((text) => `<div><span dir="auto">${text}</span></div>`).join("");
  return `<a href="/marketplace/item/${id}/?ref=x"><img alt="" src="https://evil.test/a.jpg">${spans}</a>`;
}

describe("parseMarketplacePage", () => {
  let listings: CapturedListing[];

  beforeAll(() => {
    listings = parseMarketplacePage(documentFrom(readFileSync(FIXTURE_PATH, "utf8")), CAPTURED_AT);
  });

  it("parses every listing card on the page", () => {
    expect(listings).toHaveLength(4);
    expect(listings.every((listing) => listing.source === "marketplace")).toBe(true);
  });

  it("reads price, rooms and a canonical url without tracking", () => {
    expect(listings[0]).toMatchObject({
      externalId: "1797716728094287",
      url: "https://www.facebook.com/marketplace/item/1797716728094287/",
      title: "3 habitaciones 2 baños Solo habitación",
      monthlyRentUsd: 350,
      bedrooms: 3,
      bathrooms: 2,
      neighborhood: null,
      city: "Quito",
    });
  });

  it("uses a locality other than the city as the neighborhood", () => {
    expect(listings[2]?.neighborhood).toBe("Cumbaya");
    expect(listings[2]?.monthlyRentUsd).toBe(1200);
  });

  it("takes the current price when a previous price is shown", () => {
    expect(listings[3]?.monthlyRentUsd).toBe(550);
  });

  it("reads area and bedrooms written inside the title", () => {
    expect(listings[3]?.areaM2).toBe(200);
    expect(listings[3]?.bedrooms).toBe(5);
  });

  it("keeps the signed image url from the facebook cdn", () => {
    expect(listings[0]?.imageUrl).toMatch(/^https:\/\/scontent\.[\w.-]+\.fbcdn\.net\//);
  });

  it("leaves the rent empty when the listing is free", () => {
    const page = documentFrom(cardHtml("1", ["Gratis", "Cuarto", "Quito, P"]));

    expect(parseMarketplacePage(page, CAPTURED_AT)[0]?.monthlyRentUsd).toBeNull();
  });

  it("drops images served from unexpected hosts", () => {
    const page = documentFrom(cardHtml("1", ["US$400", "Suite", "Quito, P"]));

    expect(parseMarketplacePage(page, CAPTURED_AT)[0]?.imageUrl).toBeNull();
  });

  it("skips links that are not marketplace items", () => {
    const page = documentFrom(cardHtml("abc", ["US$400", "Suite", "Quito, P"]));

    expect(parseMarketplacePage(page, CAPTURED_AT)).toEqual([]);
  });
});

describe("isMarketplaceRentalsPage", () => {
  it.each([
    ["https://www.facebook.com/marketplace/quito/propertyrentals", true],
    ["https://www.facebook.com/marketplace/quito/propertyrentals/?exact=false", true],
    ["https://www.facebook.com/marketplace/quito/vehicles", false],
    ["https://www.facebook.com/marketplace/", false],
    ["https://www.facebook.com/groups/123", false],
  ])("treats %s as rentals: %s", (url, expected) => {
    expect(isMarketplaceRentalsPage(new URL(url))).toBe(expected);
  });
});
