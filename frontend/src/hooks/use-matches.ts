import { useQuery } from "@tanstack/react-query";
import { useServices } from "../services/services-context";
import { MATCHES_KEY } from "./use-search-profile";

export function useMatches(limit: number) {
  const { api } = useServices();
  return useQuery({ queryKey: [...MATCHES_KEY, limit], queryFn: () => api.listMatches(limit) });
}
