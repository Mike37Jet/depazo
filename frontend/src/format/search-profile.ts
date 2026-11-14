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
    typeof profile.min_bedrooms === "number"
      ? { label: `${profile.min_bedrooms}+ hab`, isPrimary: false }
      : null,
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
