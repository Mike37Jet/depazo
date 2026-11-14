import { describe, expect, it } from "vitest";
import { formatUsd } from "./currency";

describe("formatUsd", () => {
  it("shows whole dollars with the currency symbol", () => {
    const formatted = formatUsd(1250);

    expect(formatted).toContain("$");
    expect(formatted.replace(/\D/g, "")).toBe("1250");
  });
});
