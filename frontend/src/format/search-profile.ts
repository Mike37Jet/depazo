import type { SearchProfile } from "../services/api-client";
import { formatUsd } from "./currency";

export interface FilterChip {
  label: string;
  isPrimary: boolean;
}

export function describeFilters(profile: SearchProfile): FilterChip[] {
  const [firstNeighborhood, ...otherNeighborhoods] = profile.preferred_neighborhoods;
  const chips: Array<FilterChip | null> = [
    { label: `Hasta ${formatUsd(profile.max_monthly_cost_usd)}`, isPrimary: true },
    describeBedrooms(profile.min_bedrooms, profile.max_bedrooms),
    typeof profile.min_bathrooms === "number"
      ? { label: `${profile.min_bathrooms}+ baños`, isPrimary: false }
      : null,
    typeof profile.min_area_m2 === "number"
      ? { label: `${Math.round(profile.min_area_m2)}+ m²`, isPrimary: false }
      : null,
    firstNeighborhood
      ? {
          label:
            otherNeighborhoods.length > 0
              ? `${firstNeighborhood} +${otherNeighborhoods.length}`
              : firstNeighborhood,
          isPrimary: false,
        }
      : null,
  ];
  return chips.filter((chip): chip is FilterChip => chip !== null);
}

export interface ScoreWeights {
  price: number;
  area: number;
  neighborhood: number;
}

const PERCENT = 100;
const PERCENT_SIGN = "\u00a0%";

export function describeScoreWeights(weights: ScoreWeights): string {
  const total = weights.price + weights.area + weights.neighborhood;
  const share = (weight: number) => Math.round((weight / total) * PERCENT);
  return `precio (${share(weights.price)}${PERCENT_SIGN}), superficie (${share(weights.area)}${PERCENT_SIGN}) y sector (${share(weights.neighborhood)}${PERCENT_SIGN})`;
}

function describeBedrooms(
  minimum: number | null | undefined,
  maximum: number | null | undefined,
): FilterChip | null {
  if (typeof minimum === "number" && typeof maximum === "number") {
    const range = minimum === maximum ? `${minimum}` : `${minimum} a ${maximum}`;
    return { label: `${range} hab`, isPrimary: false };
  }
  if (typeof minimum === "number") {
    return { label: `${minimum}+ hab`, isPrimary: false };
  }
  if (typeof maximum === "number") {
    return { label: `Hasta ${maximum} hab`, isPrimary: false };
  }
  return null;
}
