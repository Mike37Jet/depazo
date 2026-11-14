import { describe, expect, it } from "vitest";
import { SAVED_PROFILE } from "../test/api-fixtures";
import {
  decodeSharedSearch,
  encodeSharedSearch,
  readSharedSearchToken,
  type SharedSearch,
  sharedSearchHash,
} from "./shared-search";

const SEARCH: SharedSearch = {
  max_monthly_cost_usd: 850.5,
  min_monthly_cost_usd: 300,
  is_condo_fee_in_budget: false,
  min_bedrooms: 2,
  max_bedrooms: 3,
  min_bathrooms: 1,
  min_area_m2: 70,
  preferred_neighborhoods: ["González Suárez", "Cumbayá"],
  excluded_neighborhoods: ["Carcelén"],
  min_score: 55,
};

function tokenFor(payload: unknown): string {
  return btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_");
}

describe("shared search link", () => {
  it("round-trips a search with accents through a url-safe token", () => {
    const token = encodeSharedSearch(SEARCH);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSharedSearch(token)).toEqual(SEARCH);
  });

  it("leaves the score weights of the sender out of the link", () => {
    const decoded = decodeSharedSearch(encodeSharedSearch(SAVED_PROFILE));

    expect(decoded).not.toHaveProperty("weights");
    expect(decoded).toMatchObject({ max_monthly_cost_usd: 900, min_bedrooms: 2 });
  });

  it("reads the token back from the location hash", () => {
    const hash = sharedSearchHash(SEARCH);

    expect(readSharedSearchToken(`#${hash}`)).toBe(encodeSharedSearch(SEARCH));
    expect(readSharedSearchToken("")).toBeNull();
    expect(readSharedSearchToken("#otra=cosa")).toBeNull();
  });

  it.each([
    ["text that is not a token", "no es un enlace"],
    ["an unknown format version", tokenFor({ v: 2, max: 900 })],
    ["a missing budget", tokenFor({ v: 1, condo: true, pref: [], excl: [], score: 60 })],
    [
      "a budget beyond the limit",
      tokenFor({ v: 1, max: 9_000_000, condo: true, pref: [], excl: [], score: 60 }),
    ],
    [
      "a fractional room count",
      tokenFor({ v: 1, max: 900, condo: true, bedMax: 2.5, pref: [], excl: [], score: 60 }),
    ],
    [
      "neighborhoods that are not text",
      tokenFor({ v: 1, max: 900, condo: true, pref: [{ html: "x" }], excl: [], score: 60 }),
    ],
    ["an oversized token", "A".repeat(9000)],
  ])("rejects %s", (_case, token) => {
    expect(decodeSharedSearch(token)).toBeNull();
  });
});
