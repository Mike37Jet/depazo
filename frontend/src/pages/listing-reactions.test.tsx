import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { aMatch, aReport } from "../test/api-fixtures";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

const REACTION_URL = `${API_BASE_URL}/me/listings/:source/:externalId/reaction`;

interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

function recordReactions(): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  const record = async ({ request }: { request: Request }) => {
    requests.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: request.method === "PUT" ? await request.json() : null,
    });
    return new HttpResponse(null, { status: 204 });
  };
  server.use(http.put(REACTION_URL, record), http.delete(REACTION_URL, record));
  return requests;
}

describe("Saving and discarding listings", () => {
  it("saves a listing with the heart", async () => {
    const requests = recordReactions();
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () =>
        HttpResponse.json(aReport([{ ...aMatch(), is_saved: requests.length > 0 }])),
      ),
    );
    const { user } = renderApp("/");

    await user.click(
      await screen.findByRole("button", { name: "Agregar La Carolina a favoritos" }),
    );

    expect(
      await screen.findByRole("button", { name: "Quitar La Carolina de favoritos" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(requests).toEqual([
      {
        method: "PUT",
        path: "/me/listings/icasas/listing-1/reaction",
        body: { reaction: "saved" },
      },
    ]);
  });

  it("hides a discarded listing and lets the user undo it", async () => {
    const requests = recordReactions();
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () =>
        HttpResponse.json(
          requests.at(-1)?.body === null || requests.length === 0
            ? aReport([aMatch()])
            : { ...aReport([]), discarded_count: 1 },
        ),
      ),
    );
    const { user } = renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Descartar La Carolina" }));

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("Descartado: La Carolina");

    await user.click(screen.getByRole("button", { name: "Deshacer" }));

    await waitFor(() =>
      expect(requests.map((request) => request.method)).toEqual(["PUT", "DELETE"]),
    );
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });

  it("lists saved listings in Favoritos", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/saved-listings`, () =>
        HttpResponse.json({
          matches: [{ ...aMatch(), is_saved: true, passed_hard_filters: false }],
        }),
      ),
    );

    renderApp("/favoritos");

    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(screen.getByText("Ya no cumple tus filtros")).toBeInTheDocument();
    expect(screen.getByText("1 anuncio guardado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descartar/ })).not.toBeInTheDocument();
  });

  it("removes a listing from Favoritos when the heart is turned off", async () => {
    const requests = recordReactions();
    server.use(
      http.get(`${API_BASE_URL}/me/saved-listings`, () =>
        HttpResponse.json({
          matches: requests.length === 0 ? [{ ...aMatch(), is_saved: true }] : [],
        }),
      ),
    );
    const { user } = renderApp("/favoritos");

    await user.click(
      await screen.findByRole("button", { name: "Quitar La Carolina de favoritos" }),
    );

    expect(await screen.findByText("Aún no tienes favoritos")).toBeInTheDocument();
    expect(requests.map((request) => request.method)).toEqual(["DELETE"]);
  });

  it("invites the user to save listings when Favoritos is empty", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/saved-listings`, () => HttpResponse.json({ matches: [] })),
    );

    renderApp("/favoritos");

    expect(await screen.findByRole("link", { name: "Ver anuncios para ti" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
