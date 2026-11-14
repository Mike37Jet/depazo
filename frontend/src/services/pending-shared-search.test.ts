import { beforeEach, describe, expect, it } from "vitest";
import { keepPendingSharedSearch, takePendingSharedSearch } from "./pending-shared-search";

describe("pending shared search", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("hands the kept token back only once", () => {
    keepPendingSharedSearch("abc", sessionStorage);

    expect(takePendingSharedSearch(sessionStorage)).toBe("abc");
    expect(takePendingSharedSearch(sessionStorage)).toBeNull();
  });

  it("has nothing pending without storage", () => {
    keepPendingSharedSearch("abc", undefined);

    expect(takePendingSharedSearch(undefined)).toBeNull();
  });
});
