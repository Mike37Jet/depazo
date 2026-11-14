import { describe, expect, it } from "vitest";
import { describeFacts, isSafeHttpsUrl, sourceName } from "./listing";

describe("isSafeHttpsUrl", () => {
  it.each([
    ["https://www.icasas.ec/a", true],
    ["http://www.icasas.ec/a", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
    [null, false],
  ])("accepts only https urls (%s)", (url, expected) => {
    expect(isSafeHttpsUrl(url)).toBe(expected);
  });
});

describe("describeFacts", () => {
  it("lists only the known facts with singular and plural forms", () => {
    const facts = describeFacts({ bedrooms: 1, bathrooms: 2, area_m2: 80.4 });

    expect(facts).toEqual(["1 hab", "2 baños", "80 m²"]);
  });

  it("skips unknown facts", () => {
    expect(describeFacts({ bedrooms: null, bathrooms: null, area_m2: null })).toEqual([]);
  });
});

describe("sourceName", () => {
  it("uses the portal's display name and falls back to the raw source", () => {
    expect([sourceName("icasas"), sourceName("arriendos_ec"), sourceName("otro")]).toEqual([
      "iCasas",
      "arriendos.ec",
      "otro",
    ]);
  });
});
