import type { SearchProfile } from "../services/api-client";

export type SharedSearch = Omit<SearchProfile, "weights">;

const FORMAT_VERSION = 1;
const HASH_KEY = "compartida";
const MAX_TOKEN_LENGTH = 8000;
const MAX_MONTHLY_COST = 100_000;
const MAX_ROOMS = 20;
const MAX_AREA = 2000;
const MAX_SCORE = 100;
const MAX_NEIGHBORHOODS = 100;
const MAX_NEIGHBORHOOD_LENGTH = 80;
const INVALID = Symbol("invalid");

type Read<Value> = Value | typeof INVALID;

export function encodeSharedSearch(search: SharedSearch): string {
  const payload = {
    v: FORMAT_VERSION,
    max: search.max_monthly_cost_usd,
    min: search.min_monthly_cost_usd ?? null,
    condo: search.is_condo_fee_in_budget,
    bedMin: search.min_bedrooms ?? null,
    bedMax: search.max_bedrooms ?? null,
    bathMin: search.min_bathrooms ?? null,
    area: search.min_area_m2 ?? null,
    pref: search.preferred_neighborhoods,
    excl: search.excluded_neighborhoods,
    score: search.min_score,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeSharedSearch(token: string): SharedSearch | null {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  const payload = parsePayload(token);
  if (!isRecord(payload) || payload.v !== FORMAT_VERSION) {
    return null;
  }
  const maxMonthlyCost = readAmount(payload.max, MAX_MONTHLY_COST);
  const minMonthlyCost = readOptional(payload.min, (value) => readAmount(value, MAX_MONTHLY_COST));
  const minBedrooms = readOptional(payload.bedMin, (value) => readCount(value, MAX_ROOMS));
  const maxBedrooms = readOptional(payload.bedMax, (value) => readCount(value, MAX_ROOMS));
  const minBathrooms = readOptional(payload.bathMin, (value) => readCount(value, MAX_ROOMS));
  const minArea = readOptional(payload.area, (value) => readAmount(value, MAX_AREA));
  const preferred = readNeighborhoods(payload.pref);
  const excluded = readNeighborhoods(payload.excl);
  const minScore = readCount(payload.score, MAX_SCORE);
  if (
    maxMonthlyCost === INVALID ||
    minMonthlyCost === INVALID ||
    minBedrooms === INVALID ||
    maxBedrooms === INVALID ||
    minBathrooms === INVALID ||
    minArea === INVALID ||
    preferred === INVALID ||
    excluded === INVALID ||
    minScore === INVALID ||
    typeof payload.condo !== "boolean"
  ) {
    return null;
  }
  return {
    max_monthly_cost_usd: maxMonthlyCost,
    min_monthly_cost_usd: minMonthlyCost,
    is_condo_fee_in_budget: payload.condo,
    min_bedrooms: minBedrooms,
    max_bedrooms: maxBedrooms,
    min_bathrooms: minBathrooms,
    min_area_m2: minArea,
    preferred_neighborhoods: preferred,
    excluded_neighborhoods: excluded,
    min_score: minScore,
  };
}

export function sharedSearchHash(search: SharedSearch): string {
  return sharedSearchTokenHash(encodeSharedSearch(search));
}

export function sharedSearchTokenHash(token: string): string {
  return `${HASH_KEY}=${token}`;
}

export function readSharedSearchToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get(HASH_KEY);
  return token === null || token.length === 0 ? null : token;
}

function parsePayload(token: string): unknown {
  try {
    const binary = atob(token.replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAmount(value: unknown, maximum: number): Read<number> {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= maximum
    ? value
    : INVALID;
}

function readCount(value: unknown, maximum: number): Read<number> {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum
    ? value
    : INVALID;
}

function readOptional(
  value: unknown,
  read: (present: unknown) => Read<number>,
): Read<number | null> {
  return value === null || value === undefined ? null : read(value);
}

function readNeighborhoods(value: unknown): Read<string[]> {
  if (!Array.isArray(value) || value.length > MAX_NEIGHBORHOODS) {
    return INVALID;
  }
  const names = value.filter(
    (name): name is string =>
      typeof name === "string" && name.trim().length > 0 && name.length <= MAX_NEIGHBORHOOD_LENGTH,
  );
  return names.length === value.length ? names : INVALID;
}
