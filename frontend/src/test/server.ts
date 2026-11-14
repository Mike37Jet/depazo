import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

export const API_BASE_URL = "http://api.test";

export const NEIGHBORHOODS = [
  { name: "La Carolina", listing_count: 154 },
  { name: "Cumbayá", listing_count: 30 },
  { name: "Carcelén", listing_count: 12 },
];

export const server = setupServer(
  http.get(`${API_BASE_URL}/me/search-profile`, () => new HttpResponse(null, { status: 404 })),
  http.get(`${API_BASE_URL}/neighborhoods`, () =>
    HttpResponse.json({ neighborhoods: NEIGHBORHOODS }),
  ),
);
