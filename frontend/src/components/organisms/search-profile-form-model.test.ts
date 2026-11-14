import { describe, expect, it } from "vitest";
import { SAVED_PROFILE } from "../../test/api-fixtures";
import { toFormValues, validateSearchProfile } from "./search-profile-form-model";

describe("validateSearchProfile", () => {
  it("round-trips a saved profile into the same request", () => {
    const outcome = validateSearchProfile(toFormValues(SAVED_PROFILE), SAVED_PROFILE.weights);

    expect(outcome).toEqual({ isValid: true, input: SAVED_PROFILE });
  });

  it("starts empty with sensible defaults for a new user", () => {
    const values = toFormValues(null);

    expect(values).toMatchObject({ maxMonthlyCost: "", isCondoFeeInBudget: true, minScore: "60" });
  });

  it("accepts comma decimals and leaves blank optional fields as null", () => {
    const values = { ...toFormValues(null), maxMonthlyCost: "850,50" };

    const outcome = validateSearchProfile(values, undefined);

    expect(outcome).toMatchObject({
      isValid: true,
      input: { max_monthly_cost_usd: 850.5, min_bedrooms: null, weights: { price: 0.5 } },
    });
  });

  it.each([
    [{ maxMonthlyCost: "" }, "maxMonthlyCost"],
    [{ maxMonthlyCost: "-5" }, "maxMonthlyCost"],
    [{ maxMonthlyCost: "500", minMonthlyCost: "600" }, "minMonthlyCost"],
    [{ minBedrooms: "1.5" }, "minBedrooms"],
    [{ minArea: "5000" }, "minArea"],
    [{ minScore: "101" }, "minScore"],
    [
      { preferredNeighborhoods: ["Cumbayá"], excludedNeighborhoods: ["cumbayá"] },
      "excludedNeighborhoods",
    ],
  ])("rejects %o next to the %s field", (overrides, field) => {
    const values = { ...toFormValues(SAVED_PROFILE), ...overrides };

    const outcome = validateSearchProfile(values, undefined);

    expect(outcome.isValid).toBe(false);
    expect(outcome.isValid ? {} : outcome.errors).toHaveProperty(field);
  });
});
