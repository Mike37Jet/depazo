import createClient, { type Client } from "openapi-fetch";
import type { components, paths } from "../api/schema";
import type { AuthGateway } from "./auth-gateway";

export type SearchProfile = components["schemas"]["SearchProfileBody-Output"];
export type SearchProfileInput = components["schemas"]["SearchProfileBody-Input"];
export type Matches = components["schemas"]["MatchesBody"];
export type Match = components["schemas"]["MatchBody"];
export type ListingSummary = components["schemas"]["ListingBody"];
export type CriterionScore = components["schemas"]["CriterionBody"];
export type Neighborhood = components["schemas"]["NeighborhoodBody"];

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
}

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
  };
}

function absoluteUrl(baseUrl: string): string {
  return new URL(baseUrl, globalThis.location?.origin ?? "http://localhost").href.replace(
    /\/$/,
    "",
  );
}
