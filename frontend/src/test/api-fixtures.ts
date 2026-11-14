import type { Match, Matches, SearchProfile } from "../services/api-client";

export const SAVED_PROFILE: SearchProfile = {
  max_monthly_cost_usd: 900,
  min_monthly_cost_usd: null,
  is_condo_fee_in_budget: true,
  min_bedrooms: 2,
  min_bathrooms: null,
  min_area_m2: null,
  preferred_neighborhoods: ["La Carolina"],
  excluded_neighborhoods: [],
  weights: { price: 0.5, area: 0.25, neighborhood: 0.25 },
  min_score: 60,
};

export function aMatch(overrides: Partial<Match["listing"]> = {}, score = 87): Match {
  return {
    score,
    breakdown: [
      { criterion: "price", value: 0.9, weight: 0.5 },
      { criterion: "area", value: 0.8, weight: 0.25 },
      { criterion: "neighborhood", value: 1, weight: 0.25 },
    ],
    listing: {
      source: "icasas",
      external_id: "listing-1",
      url: "https://www.icasas.ec/inmueble/listing-1",
      title: "Departamento amoblado en La Carolina",
      description: "Luminoso",
      monthly_rent_usd: 720,
      condo_fee_usd: 80,
      area_m2: 95,
      bedrooms: 2,
      bathrooms: 2,
      neighborhood: "La Carolina",
      city: "Quito",
      latitude: null,
      longitude: null,
      image_url: null,
      ...overrides,
    },
  };
}

export function aReport(matches: Match[], evaluatedCount = 10): Matches {
  return {
    matches,
    match_count: matches.length,
    evaluated_count: evaluatedCount,
    rejected_count: evaluatedCount - matches.length,
  };
}
