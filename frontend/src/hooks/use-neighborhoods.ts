import { useQuery } from "@tanstack/react-query";
import type { PlaceOption } from "../format/place-name";
import { useServices } from "../services/services-context";

const NEIGHBORHOODS_KEY = ["neighborhoods"] as const;
const ONE_HOUR_MS = 3_600_000;

export function useNeighborhoods() {
  const { api } = useServices();
  return useQuery({
    queryKey: NEIGHBORHOODS_KEY,
    queryFn: () => api.listNeighborhoods(),
    staleTime: ONE_HOUR_MS,
    select: (neighborhoods): PlaceOption[] =>
      neighborhoods.map(({ name, listing_count }) => ({ name, listingCount: listing_count })),
  });
}
