import type { SearchProfile, SearchProfileInput } from "../../services/api-client";

export interface SearchProfileFormValues {
  maxMonthlyCost: string;
  minMonthlyCost: string;
  isCondoFeeInBudget: boolean;
  minBedrooms: string;
  maxBedrooms: string;
  minBathrooms: string;
  minArea: string;
  preferredNeighborhoods: string[];
  excludedNeighborhoods: string[];
  minScore: string;
}

export type SearchProfileFormErrors = Partial<Record<keyof SearchProfileFormValues, string>>;

export type ValidationOutcome =
  | { isValid: true; input: SearchProfileInput }
  | { isValid: false; errors: SearchProfileFormErrors };

const DEFAULT_MIN_SCORE = 60;
export const DEFAULT_WEIGHTS = { price: 0.5, area: 0.25, neighborhood: 0.25 };
const MAX_MONTHLY_COST = 100_000;
const MAX_ROOMS = 20;
const MAX_AREA = 2000;
const MAX_SCORE = 100;

export function toFormValues(profile: SearchProfile | null): SearchProfileFormValues {
  return {
    maxMonthlyCost: profile ? String(profile.max_monthly_cost_usd) : "",
    minMonthlyCost: asText(profile?.min_monthly_cost_usd),
    isCondoFeeInBudget: profile?.is_condo_fee_in_budget ?? true,
    minBedrooms: asText(profile?.min_bedrooms),
    maxBedrooms: asText(profile?.max_bedrooms),
    minBathrooms: asText(profile?.min_bathrooms),
    minArea: asText(profile?.min_area_m2),
    preferredNeighborhoods: profile?.preferred_neighborhoods ?? [],
    excludedNeighborhoods: profile?.excluded_neighborhoods ?? [],
    minScore: String(profile?.min_score ?? DEFAULT_MIN_SCORE),
  };
}

export function validateSearchProfile(
  values: SearchProfileFormValues,
  weights: SearchProfile["weights"] | undefined,
): ValidationOutcome {
  const errors: SearchProfileFormErrors = {};
  const maxMonthlyCost = parseAmount(values.maxMonthlyCost);
  const minMonthlyCost = parseAmount(values.minMonthlyCost);
  const minBedrooms = parseCount(values.minBedrooms);
  const maxBedrooms = parseCount(values.maxBedrooms);
  const minBathrooms = parseCount(values.minBathrooms);
  const minArea = parseAmount(values.minArea);
  const minScore = parseCount(values.minScore);

  if (
    maxMonthlyCost === null ||
    maxMonthlyCost === "invalid" ||
    maxMonthlyCost > MAX_MONTHLY_COST
  ) {
    errors.maxMonthlyCost = "Escribe tu presupuesto máximo en dólares, por ejemplo 900.";
  }
  if (
    minMonthlyCost === "invalid" ||
    (typeof minMonthlyCost === "number" && minMonthlyCost > MAX_MONTHLY_COST)
  ) {
    errors.minMonthlyCost = "Escribe un monto en dólares o déjalo vacío.";
  } else if (
    typeof minMonthlyCost === "number" &&
    typeof maxMonthlyCost === "number" &&
    minMonthlyCost > maxMonthlyCost
  ) {
    errors.minMonthlyCost = "El mínimo no puede ser mayor que el máximo.";
  }
  if (minBedrooms === "invalid" || (typeof minBedrooms === "number" && minBedrooms > MAX_ROOMS)) {
    errors.minBedrooms = `Usa un número entero entre 0 y ${MAX_ROOMS}.`;
  }
  if (maxBedrooms === "invalid" || (typeof maxBedrooms === "number" && maxBedrooms > MAX_ROOMS)) {
    errors.maxBedrooms = `Usa un número entero entre 0 y ${MAX_ROOMS}.`;
  } else if (
    typeof maxBedrooms === "number" &&
    typeof minBedrooms === "number" &&
    maxBedrooms < minBedrooms
  ) {
    errors.maxBedrooms = "El máximo no puede ser menor que el mínimo.";
  }
  if (
    minBathrooms === "invalid" ||
    (typeof minBathrooms === "number" && minBathrooms > MAX_ROOMS)
  ) {
    errors.minBathrooms = `Usa un número entero entre 0 y ${MAX_ROOMS}.`;
  }
  if (minArea === "invalid" || (typeof minArea === "number" && minArea > MAX_AREA)) {
    errors.minArea = `Usa un área entre 1 y ${MAX_AREA} m², o déjala vacía.`;
  }
  if (minScore === null || minScore === "invalid" || minScore > MAX_SCORE) {
    errors.minScore = "Usa un número entero entre 0 y 100.";
  }
  const overlapping = values.preferredNeighborhoods.filter((name) =>
    values.excludedNeighborhoods.some((excluded) => excluded.toLowerCase() === name.toLowerCase()),
  );
  if (overlapping.length > 0) {
    errors.excludedNeighborhoods = `${overlapping.join(", ")} está en preferidos y en excluidos.`;
  }

  if (
    Object.keys(errors).length > 0 ||
    typeof maxMonthlyCost !== "number" ||
    typeof minScore !== "number"
  ) {
    return { isValid: false, errors };
  }
  return {
    isValid: true,
    input: {
      max_monthly_cost_usd: maxMonthlyCost,
      min_monthly_cost_usd: numberOrNull(minMonthlyCost),
      is_condo_fee_in_budget: values.isCondoFeeInBudget,
      min_bedrooms: numberOrNull(minBedrooms),
      max_bedrooms: numberOrNull(maxBedrooms),
      min_bathrooms: numberOrNull(minBathrooms),
      min_area_m2: numberOrNull(minArea),
      preferred_neighborhoods: values.preferredNeighborhoods,
      excluded_neighborhoods: values.excludedNeighborhoods,
      min_score: minScore,
      weights: weights ?? DEFAULT_WEIGHTS,
    },
  };
}

type Parsed = number | null | "invalid";

function parseAmount(text: string): Parsed {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : "invalid";
}

function parseCount(text: string): Parsed {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : "invalid";
}

function numberOrNull(value: Parsed): number | null {
  return typeof value === "number" ? value : null;
}

function asText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
