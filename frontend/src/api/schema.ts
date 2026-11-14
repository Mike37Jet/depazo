export interface paths {
  "/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["health_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/me/listings/{source}/{external_id}/reaction": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put: operations["react_to_listing_me_listings__source___external_id__reaction_put"];
    post?: never;
    delete: operations["clear_listing_reaction_me_listings__source___external_id__reaction_delete"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/me/matches": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_matches_me_matches_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/me/saved-listings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_saved_listings_me_saved_listings_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/me/search-profile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["read_search_profile_me_search_profile_get"];
    put: operations["replace_search_profile_me_search_profile_put"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/neighborhoods": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_neighborhoods_neighborhoods_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    CriterionBody: {
      criterion: string;
      value: number;
      weight: number;
    };
    HTTPValidationError: {
      detail?: components["schemas"]["ValidationError"][];
    };
    ListingBody: {
      area_m2: number | null;
      bathrooms: number | null;
      bedrooms: number | null;
      city: string | null;
      condo_fee_usd: number | null;
      description: string;
      external_id: string;
      image_url: string | null;
      latitude: number | null;
      longitude: number | null;
      monthly_rent_usd: number | null;
      neighborhood: string | null;
      source: string;
      title: string;
      url: string;
    };
    MatchBody: {
      breakdown: components["schemas"]["CriterionBody"][];
      is_saved: boolean;
      listing: components["schemas"]["ListingBody"];
      passed_hard_filters: boolean;
      score: number;
    };
    MatchesBody: {
      discarded_count: number;
      evaluated_count: number;
      match_count: number;
      matches: components["schemas"]["MatchBody"][];
      rejected_count: number;
    };
    NeighborhoodBody: {
      listing_count: number;
      name: string;
    };
    NeighborhoodsBody: {
      neighborhoods: components["schemas"]["NeighborhoodBody"][];
    };
    Reaction: "saved" | "discarded";
    ReactionBody: {
      reaction: components["schemas"]["Reaction"];
    };
    SavedListingsBody: {
      matches: components["schemas"]["MatchBody"][];
    };
    "SearchProfileBody-Input": {
      excluded_neighborhoods: string[];
      is_condo_fee_in_budget: boolean;
      max_monthly_cost_usd: number | string;
      min_area_m2?: number | string | null;
      min_bathrooms?: number | null;
      min_bedrooms?: number | null;
      min_monthly_cost_usd?: number | string | null;
      min_score: number;
      preferred_neighborhoods: string[];
      weights: components["schemas"]["WeightsBody-Input"];
    };
    "SearchProfileBody-Output": {
      excluded_neighborhoods: string[];
      is_condo_fee_in_budget: boolean;
      max_monthly_cost_usd: number;
      min_area_m2?: number | null;
      min_bathrooms?: number | null;
      min_bedrooms?: number | null;
      min_monthly_cost_usd?: number | null;
      min_score: number;
      preferred_neighborhoods: string[];
      weights: components["schemas"]["WeightsBody-Output"];
    };
    ValidationError: {
      ctx?: Record<string, never>;
      input?: unknown;
      loc: (string | number)[];
      msg: string;
      type: string;
    };
    "WeightsBody-Input": {
      area: number | string;
      neighborhood: number | string;
      price: number | string;
    };
    "WeightsBody-Output": {
      area: number;
      neighborhood: number;
      price: number;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  health_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string;
          };
        };
      };
    };
  };
  react_to_listing_me_listings__source___external_id__reaction_put: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        source: string;
        external_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ReactionBody"];
      };
    };
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  clear_listing_reaction_me_listings__source___external_id__reaction_delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        source: string;
        external_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  list_matches_me_matches_get: {
    parameters: {
      query?: {
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MatchesBody"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  list_saved_listings_me_saved_listings_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SavedListingsBody"];
        };
      };
    };
  };
  read_search_profile_me_search_profile_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchProfileBody-Output"];
        };
      };
    };
  };
  replace_search_profile_me_search_profile_put: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SearchProfileBody-Input"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchProfileBody-Output"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  list_neighborhoods_neighborhoods_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["NeighborhoodsBody"];
        };
      };
    };
  };
}
