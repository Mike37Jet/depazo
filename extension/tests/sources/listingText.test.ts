import { describe, expect, it } from "vitest";
import { parseSpanishNumber } from "../../src/sources/listingText";

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
