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
