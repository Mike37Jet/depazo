import { describe, expect, it } from "vitest";
import { SAVED_PROFILE } from "../test/api-fixtures";
import { describeFilters } from "./search-profile";

describe("describeFilters", () => {
  it("summarizes the budget first and groups extra neighborhoods", () => {
    const profile = {
      ...SAVED_PROFILE,
      preferred_neighborhoods: ["La Carolina", "Cumbayá", "Quito Tenis"],
    };

    const labels = describeFilters(profile).map((chip) => chip.label);

    expect(labels[0]).toMatch(/^Hasta \$\s?900$/);
    expect(labels.slice(1)).toEqual(["2+ hab", "La Carolina +2"]);
  });

  it("marks only the budget as the primary filter", () => {
    const chips = describeFilters(SAVED_PROFILE);

    expect(chips.filter((chip) => chip.isPrimary)).toHaveLength(1);
  });
});
