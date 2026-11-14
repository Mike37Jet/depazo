import { describe, expect, it } from "vitest";
import { filterPlaceOptions, findPlaceOption, normalizePlaceName } from "./place-name";

const OPTIONS = [
  { name: "La Carolina", listingCount: 154 },
  { name: "Iñaquito", listingCount: 40 },
  { name: "Cumbayá", listingCount: 30 },
  { name: "Carcelén", listingCount: 12 },
];

describe("normalizePlaceName", () => {
  it("ignores accents, case and extra spaces", () => {
    expect(normalizePlaceName("  IÑAQUITO   Alto ")).toBe("inaquito alto");
  });
});

describe("filterPlaceOptions", () => {
  it("matches any part of the name without accents", () => {
    const names = filterPlaceOptions(OPTIONS, "car", []).map((option) => option.name);

    expect(names).toEqual(["La Carolina", "Carcelén"]);
  });

  it("leaves out places already chosen", () => {
    const names = filterPlaceOptions(OPTIONS, "", ["la carolina"]).map((option) => option.name);

    expect(names).toEqual(["Iñaquito", "Cumbayá", "Carcelén"]);
  });

  it("shows at most six suggestions", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      name: `Sector ${index}`,
      listingCount: 1,
    }));

    expect(filterPlaceOptions(many, "sector", [])).toHaveLength(6);
  });
});

describe("findPlaceOption", () => {
  it("finds the option typed without accents", () => {
    expect(findPlaceOption(OPTIONS, "cumbaya")?.name).toBe("Cumbayá");
  });

  it("finds nothing for a misspelled place", () => {
    expect(findPlaceOption(OPTIONS, "Carolna")).toBeUndefined();
  });
});
