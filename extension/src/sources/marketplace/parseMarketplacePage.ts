import { type CapturedListing, capturedListingSchema } from "../../capture/capturedListing";
import {
  firstNumberMatching,
  httpsUrlOnHost,
  normalizeWhitespace,
  parseSpanishNumber,
} from "../listingText";

export const MARKETPLACE_ORIGIN = "https://www.facebook.com";

const CITY_NAME = "Quito";
const IMAGE_HOST_SUFFIX = ".fbcdn.net";
const ITEM_LINK_SELECTOR = 'a[href*="/marketplace/item/"]';
const CARD_TEXT_SELECTOR = 'span[dir="auto"]';
const ITEM_PATH_PATTERN = /^\/marketplace\/item\/(\d{1,30})\/?/;
const RENTALS_PATH_PATTERN = /^\/marketplace\/[^/]+\/propertyrentals(\/|$)/;
const USD_PRICE_PATTERN = /^US\$\s*([\d.,]+)$/;
const TITLE_PATTERNS = {
  areaM2: /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts|metros)/i,
  bedrooms: /(\d+)\s*(?:habitaci|dormitorio|cuarto)/i,
  bathrooms: /(\d+)\s*baño/i,
} as const;

export function isMarketplaceRentalsPage(url: URL): boolean {
  return url.origin === MARKETPLACE_ORIGIN && RENTALS_PATH_PATTERN.test(url.pathname);
}

export function parseMarketplacePage(root: ParentNode, capturedAt: Date): CapturedListing[] {
  return [...root.querySelectorAll<HTMLAnchorElement>(ITEM_LINK_SELECTOR)].flatMap((link) => {
    const listing = parseCard(link, capturedAt);
    return listing === null ? [] : [listing];
  });
}

function parseCard(link: HTMLAnchorElement, capturedAt: Date): CapturedListing | null {
  const externalId = itemIdOf(link.getAttribute("href") ?? "");
  const texts = [...link.querySelectorAll(CARD_TEXT_SELECTOR)].map((node) =>
    normalizeWhitespace(node.textContent ?? ""),
  );
  const [price, title, place] = [texts[0], texts.at(-2), texts.at(-1)];
  if (externalId === null || title === undefined || place === undefined || texts.length < 3) {
    return null;
  }
  const neighborhood = neighborhoodFrom(place);
  const candidate = {
    source: "marketplace",
    externalId,
    url: `${MARKETPLACE_ORIGIN}/marketplace/item/${externalId}/`,
    title: title.slice(0, 300),
    monthlyRentUsd: usdPriceIn(price ?? ""),
    condoFeeUsd: null,
    areaM2: firstNumberMatching([title], TITLE_PATTERNS.areaM2),
    bedrooms: firstNumberMatching([title], TITLE_PATTERNS.bedrooms),
    bathrooms: firstNumberMatching([title], TITLE_PATTERNS.bathrooms),
    neighborhood,
    city: CITY_NAME,
    imageUrl: imageUrlOf(link),
    capturedAt: capturedAt.toISOString(),
  };
  const parsed = capturedListingSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function itemIdOf(href: string): string | null {
  if (!URL.canParse(href, MARKETPLACE_ORIGIN)) {
    return null;
  }
  return ITEM_PATH_PATTERN.exec(new URL(href, MARKETPLACE_ORIGIN).pathname)?.[1] ?? null;
}

function usdPriceIn(text: string): number | null {
  const amount = USD_PRICE_PATTERN.exec(text)?.[1];
  return amount === undefined ? null : parseSpanishNumber(amount);
}

function neighborhoodFrom(place: string): string | null {
  const locality = place.split(",")[0]?.trim() ?? "";
  if (
    locality.length === 0 ||
    locality.localeCompare(CITY_NAME, "es", { sensitivity: "base" }) === 0
  ) {
    return null;
  }
  return locality;
}

function imageUrlOf(link: HTMLAnchorElement): string | null {
  const url = httpsUrlOnHost(link.querySelector("img")?.getAttribute("src"), IMAGE_HOST_SUFFIX);
  return url === null ? null : url.href;
}
