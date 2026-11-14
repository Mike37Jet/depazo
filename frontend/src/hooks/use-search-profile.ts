import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SearchProfileInput } from "../services/api-client";
import { useServices } from "../services/services-context";

export const SEARCH_PROFILE_KEY = ["search-profile"] as const;
export const MATCHES_KEY = ["matches"] as const;

export function useSearchProfile() {
  const { api } = useServices();
  return useQuery({ queryKey: SEARCH_PROFILE_KEY, queryFn: () => api.readSearchProfile() });
}

export function useSaveSearchProfile() {
  const { api } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SearchProfileInput) => api.saveSearchProfile(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(SEARCH_PROFILE_KEY, saved);
      return queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}
