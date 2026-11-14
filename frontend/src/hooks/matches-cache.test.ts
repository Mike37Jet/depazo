import { describe, expect, it } from "vitest";
import { aMatch, aReport } from "../test/api-fixtures";
import { withoutListing, withSavedState } from "./matches-cache";

const FIRST = { source: "icasas", external_id: "listing-1" };
const SECOND = { source: "icasas", external_id: "listing-2" };

describe("withSavedState", () => {
  it("marks only the chosen listing", () => {
    const report = aReport([aMatch(), aMatch({ external_id: "listing-2" })]);

    const updated = withSavedState(report, SECOND, true);

    expect(updated?.matches.map((match) => match.is_saved)).toEqual([false, true]);
  });

  it("keeps an unloaded report as it is", () => {
    expect(withSavedState(null, FIRST, true)).toBeNull();
  });
});

describe("withoutListing", () => {
  it("removes the listing and counts it as discarded", () => {
    const report = aReport([aMatch(), aMatch({ external_id: "listing-2" })], 10);

    const updated = withoutListing(report, FIRST);

    expect(updated?.matches.map((match) => match.listing.external_id)).toEqual(["listing-2"]);
    expect(updated).toMatchObject({ match_count: 1, evaluated_count: 9, discarded_count: 1 });
  });

  it("leaves the report alone when the listing is not in it", () => {
    const report = aReport([aMatch()]);

    expect(withoutListing(report, SECOND)).toBe(report);
  });
});
