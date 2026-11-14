import createClient, { type Client } from "openapi-fetch";
import type { components, paths } from "../api/schema";
import type { AuthGateway } from "./auth-gateway";
import type { PushDevice } from "./push-gateway";

export type SearchProfile = components["schemas"]["SearchProfileBody-Output"];
export type SearchProfileInput = components["schemas"]["SearchProfileBody-Input"];
export type Matches = components["schemas"]["MatchesBody"];
export type Match = components["schemas"]["MatchBody"];
export type ListingSummary = components["schemas"]["ListingBody"];
export type CriterionScore = components["schemas"]["CriterionBody"];
export type Neighborhood = components["schemas"]["NeighborhoodBody"];
export type Reaction = components["schemas"]["ReactionBody"]["reaction"];
export type ListingReference = Pick<ListingSummary, "source" | "external_id">;

export class ApiRequestError extends Error {
  override name = "ApiRequestError";

  constructor(readonly status: number) {
    super(`api answered ${status}`);
  }
}

export interface DepazoApi {
  readSearchProfile(): Promise<SearchProfile | null>;
  saveSearchProfile(profile: SearchProfileInput): Promise<SearchProfile>;
  listMatches(limit: number): Promise<Matches | null>;
  listNeighborhoods(): Promise<Neighborhood[]>;
  listSavedListings(): Promise<Match[] | null>;
  reactToListing(listing: ListingReference, reaction: Reaction): Promise<void>;
  clearReaction(listing: ListingReference): Promise<void>;
  subscribeToPush(device: PushDevice): Promise<void>;
  unsubscribeFromPush(endpoint: string): Promise<void>;
}

const REACTION_PATH = "/me/listings/{source}/{external_id}/reaction";

const NOT_FOUND = 404;
const UNAUTHORIZED = 401;

export function createDepazoApi(baseUrl: string, auth: AuthGateway): DepazoApi {
  const client: Client<paths> = createClient<paths>({ baseUrl: absoluteUrl(baseUrl) });
  client.use({
    async onRequest({ request }) {
      const session = await auth.currentSession();
      if (session) {
        request.headers.set("Authorization", `Bearer ${session.accessToken}`);
      }
      return request;
    },
    async onResponse({ response }) {
      if (response.status === UNAUTHORIZED) {
        await auth.signOut();
      }
      return response;
    },
  });

  return {
    async readSearchProfile() {
      const { data, response } = await client.GET("/me/search-profile");
      if (response.status === NOT_FOUND) {
        return null;
      }
      if (!data) {
        throw new ApiRequestError(response.status);
      }
      return data;
    },
    async saveSearchProfile(profile) {
      const { data, response } = await client.PUT("/me/search-profile", { body: profile });
      if (!data) {
        throw new ApiRequestError(response.status);
      }
      return data;
    },
    async listMatches(limit) {
      const { data, response } = await client.GET("/me/matches", {
        params: { query: { limit } },
      });
      if (response.status === NOT_FOUND) {
        return null;
      }
      if (!data) {
        throw new ApiRequestError(response.status);
      }
      return data;
    },
    async listNeighborhoods() {
      const { data, response } = await client.GET("/neighborhoods");
      if (!data) {
        throw new ApiRequestError(response.status);
      }
      return data.neighborhoods;
    },
    async listSavedListings() {
      const { data, response } = await client.GET("/me/saved-listings");
      if (response.status === NOT_FOUND) {
        return null;
      }
      if (!data) {
        throw new ApiRequestError(response.status);
      }
      return data.matches;
    },
    async reactToListing(listing, reaction) {
      const { response } = await client.PUT(REACTION_PATH, {
        params: { path: toPathParams(listing) },
        body: { reaction },
      });
      if (!response.ok) {
        throw new ApiRequestError(response.status);
      }
    },
    async clearReaction(listing) {
      const { response } = await client.DELETE(REACTION_PATH, {
        params: { path: toPathParams(listing) },
      });
      if (!response.ok) {
        throw new ApiRequestError(response.status);
      }
    },
    async subscribeToPush(device) {
      const { response } = await client.PUT("/me/push-subscription", {
        body: { endpoint: device.endpoint, keys: device.keys },
      });
      if (!response.ok) {
        throw new ApiRequestError(response.status);
      }
    },
    async unsubscribeFromPush(endpoint) {
      const { response } = await client.DELETE("/me/push-subscription", { body: { endpoint } });
      if (!response.ok) {
        throw new ApiRequestError(response.status);
      }
    },
  };
}

function absoluteUrl(baseUrl: string): string {
  return new URL(baseUrl, globalThis.location?.origin ?? "http://localhost").href.replace(
    /\/$/,
    "",
  );
}

function toPathParams(listing: ListingReference) {
  return { source: listing.source, external_id: listing.external_id };
}
