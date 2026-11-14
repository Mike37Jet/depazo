import { type CapturedListing, capturedListingSchema } from "../../capture/capturedListing";
import {
  firstNumberMatching,
  httpsUrlOnHost,
  normalizeWhitespace,
  parseSpanishNumber,
} from "../listingText";

export const PLUSVALIA_ORIGIN = "https://www.plusvalia.com";

const IMAGE_HOST_SUFFIX = ".naventcdn.com";
const TITLE_SEPARATOR = " · ";
const SELECTORS = {
  card: '[data-qa="posting PROPERTY"]',
  price: '[data-qa="POSTING_CARD_PRICE"]',
  condoFee: '[data-qa="expensas"]',
  features: '[data-qa="POSTING_CARD_FEATURES"] span',
  locality: '[data-qa="POSTING_CARD_LOCATION"]',
  image: '[data-qa="POSTING_CARD_GALLERY"] img',
} as const;
const FEATURE_PATTERNS = {
  areaM2: /([\d.,]+)\s*m²/,
  bedrooms: /(\d+)\s*hab/,
  bathrooms: /(\d+)\s*baño/,
} as const;
const USD_AMOUNT_PATTERN = /USD\s*([\d.,]+)/;

export function parsePlusvaliaPage(root: ParentNode, capturedAt: Date): CapturedListing[] {
  return [...root.querySelectorAll<HTMLElement>(SELECTORS.card)].flatMap((card) => {
    const listing = parseCard(card, capturedAt);
    return listing === null ? [] : [listing];
  });
}

function parseCard(card: HTMLElement, capturedAt: Date): CapturedListing | null {
  const externalId = card.dataset.id;
  const listingPath = card.dataset.toPosting;
  if (!externalId || !listingPath) {
    return null;
  }
  const features = textsOf(card, SELECTORS.features);
  const [neighborhood, city] = splitLocality(textOf(card, SELECTORS.locality));
  const candidate = {
    source: "plusvalia",
    externalId,
    url: canonicalListingUrl(listingPath),
    title: titleFrom(card, neighborhood),
    monthlyRentUsd: usdAmountIn(textOf(card, SELECTORS.price)),
    condoFeeUsd: usdAmountIn(textOf(card, SELECTORS.condoFee)),
    areaM2: firstNumberMatching(features, FEATURE_PATTERNS.areaM2),
    bedrooms: firstNumberMatching(features, FEATURE_PATTERNS.bedrooms),
    bathrooms: firstNumberMatching(features, FEATURE_PATTERNS.bathrooms),
    neighborhood,
    city,
    imageUrl: imageUrlOf(card),
    capturedAt: capturedAt.toISOString(),
  };
  const parsed = capturedListingSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function textOf(card: HTMLElement, selector: string): string {
  return normalizeWhitespace(card.querySelector(selector)?.textContent ?? "");
}

function textsOf(card: HTMLElement, selector: string): string[] {
  return [...card.querySelectorAll(selector)].map((node) =>
    normalizeWhitespace(node.textContent ?? ""),
  );
}

function canonicalListingUrl(listingPath: string): string {
  const url = new URL(listingPath, PLUSVALIA_ORIGIN);
  return `${PLUSVALIA_ORIGIN}${url.pathname}`;
}

function usdAmountIn(text: string): number | null {
  const match = USD_AMOUNT_PATTERN.exec(text);
  return match?.[1] === undefined ? null : parseSpanishNumber(match[1]);
}

function splitLocality(locality: string): [string | null, string | null] {
  const parts = locality
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return [parts[0] ?? null, parts.length > 1 ? (parts.at(-1) ?? null) : null];
}

function titleFrom(card: HTMLElement, neighborhood: string | null): string {
  const imageDescription = card.querySelector(SELECTORS.image)?.getAttribute("alt") ?? "";
  const postingTitle = normalizeWhitespace(imageDescription.split(TITLE_SEPARATOR).at(-1) ?? "");
  if (postingTitle.length > 0) {
    return postingTitle.slice(0, 300);
  }
  return neighborhood === null ? "Departamento" : `Departamento en ${neighborhood}`;
}

function imageUrlOf(card: HTMLElement): string | null {
  const url = httpsUrlOnHost(
    card.querySelector(SELECTORS.image)?.getAttribute("src"),
    IMAGE_HOST_SUFFIX,
  );
  return url === null ? null : `${url.origin}${url.pathname}`;
}
