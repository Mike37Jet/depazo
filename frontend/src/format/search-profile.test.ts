import { describe, expect, it } from "vitest";
import { SAVED_PROFILE } from "../test/api-fixtures";
import { describeFilters, describeScoreWeights } from "./search-profile";

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

describe("describeScoreWeights", () => {
  it("shows each criterion as a share of the whole score", () => {
    expect(describeScoreWeights({ price: 0.5, area: 0.25, neighborhood: 0.25 })).toBe(
      "precio (50\u00a0%), superficie (25\u00a0%) y sector (25\u00a0%)",
    );
  });

  it("normalizes weights that do not add up to one", () => {
    expect(describeScoreWeights({ price: 2, area: 1, neighborhood: 1 })).toBe(
      "precio (50\u00a0%), superficie (25\u00a0%) y sector (25\u00a0%)",
    );
  });
});
