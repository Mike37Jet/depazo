import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListingReference, Match, Matches } from "../services/api-client";
import { useServices } from "../services/services-context";
import { isSameListing, withoutListing, withSavedState } from "./matches-cache";
import { MATCHES_KEY } from "./use-search-profile";

export const SAVED_LISTINGS_KEY = ["saved-listings"] as const;

export interface SavedToggle {
  listing: ListingReference;
  isSaved: boolean;
}

export function useSavedListings() {
  const { api } = useServices();
  return useQuery({ queryKey: SAVED_LISTINGS_KEY, queryFn: () => api.listSavedListings() });
}

export function useToggleSaved() {
  const { api } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listing, isSaved }: SavedToggle) =>
      isSaved ? api.reactToListing(listing, "saved") : api.clearReaction(listing),
    onMutate: async ({ listing, isSaved }: SavedToggle) => {
      await queryClient.cancelQueries({ queryKey: MATCHES_KEY });
      await queryClient.cancelQueries({ queryKey: SAVED_LISTINGS_KEY });
      queryClient.setQueriesData<Matches | null>({ queryKey: MATCHES_KEY }, (report) =>
        withSavedState(report, listing, isSaved),
      );
      if (!isSaved) {
        queryClient.setQueryData<Match[] | null>(SAVED_LISTINGS_KEY, (saved) =>
          saved?.filter((match) => !isSameListing(match, listing)),
        );
      }
    },
    onSettled: () => refreshReactions(queryClient),
  });
}

export function useDiscardListing() {
  const { api } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listing: ListingReference) => api.reactToListing(listing, "discarded"),
    onMutate: async (listing: ListingReference) => {
      await queryClient.cancelQueries({ queryKey: MATCHES_KEY });
      queryClient.setQueriesData<Matches | null>({ queryKey: MATCHES_KEY }, (report) =>
        withoutListing(report, listing),
      );
    },
    onSettled: () => refreshReactions(queryClient),
  });
}

export function useRestoreListing() {
  const { api } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listing, isSaved }: SavedToggle) =>
      isSaved ? api.reactToListing(listing, "saved") : api.clearReaction(listing),
    onSettled: () => refreshReactions(queryClient),
  });
}

function refreshReactions(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: MATCHES_KEY }),
    queryClient.invalidateQueries({ queryKey: SAVED_LISTINGS_KEY }),
  ]);
}
