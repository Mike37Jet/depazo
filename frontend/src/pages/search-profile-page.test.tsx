import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { encodeSharedSearch, readSharedSearchToken } from "../format/shared-search";
import type { SearchProfileInput } from "../services/api-client";
import { SAVED_PROFILE } from "../test/api-fixtures";
import { FakeAuthGateway, SIGNED_IN } from "../test/fake-auth-gateway";
import { FakeShareGateway } from "../test/fake-share-gateway";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

describe("SearchProfilePage", () => {
  it("marks the maximum budget as the only required field", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
    );
    renderApp("/busqueda");

    expect(await screen.findByLabelText("Máximo al mes (USD)")).toBeRequired();
    expect(screen.getByLabelText("Mínimo al mes (USD)")).not.toBeRequired();
    expect(screen.getByLabelText("Habitaciones mínimas")).not.toBeRequired();
    expect(screen.getByText(/Obligatorio/)).toBeInTheDocument();
  });

  it("loads the saved search and saves the edited one", async () => {
    let saved: SearchProfileInput | null = null;
    server.use(
      http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      http.put(`${API_BASE_URL}/me/search-profile`, async ({ request }) => {
        saved = (await request.json()) as SearchProfileInput;
        return HttpResponse.json({ ...SAVED_PROFILE, max_monthly_cost_usd: 1100 });
      }),
    );
    const { user } = renderApp("/busqueda");

    const budget = await screen.findByLabelText("Máximo al mes (USD)");
    expect(budget).toHaveValue("900");
    await user.clear(budget);
    await user.type(budget, "1100");
    await user.type(screen.getByLabelText("Preferidos"), "Cumbayá{Enter}");
    await user.click(screen.getByRole("button", { name: "Guardar búsqueda" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Búsqueda guardada");
    expect(saved).toMatchObject({
      max_monthly_cost_usd: 1100,
      preferred_neighborhoods: ["La Carolina", "Cumbayá"],
      weights: SAVED_PROFILE.weights,
    });
  });

  it("starts an empty form for a new user and flags a missing budget", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/search-profile`, () => new HttpResponse(null, { status: 404 })),
    );
    const { user } = renderApp("/busqueda");

    await user.click(await screen.findByRole("button", { name: "Guardar búsqueda" }));

    expect(screen.getByLabelText("Máximo al mes (USD)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Escribe tu presupuesto máximo/)).toBeInTheDocument();
  });

  it("explains a rejected save without losing the form", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      http.put(`${API_BASE_URL}/me/search-profile`, () => new HttpResponse(null, { status: 422 })),
    );
    const { user } = renderApp("/busqueda");

    await user.click(await screen.findByRole("button", { name: "Guardar búsqueda" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(screen.getByLabelText("Máximo al mes (USD)")).toHaveValue("900");
  });

  it("hides the saved confirmation once the user edits again", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      http.put(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
    );
    const { user } = renderApp("/busqueda");
    await user.click(await screen.findByRole("button", { name: "Guardar búsqueda" }));
    await screen.findByRole("status");

    await user.type(screen.getByLabelText("Baños mínimos"), "1");

    expect(screen.queryByText(/Búsqueda guardada/)).not.toBeInTheDocument();
  });

  it("suggests real sectors while typing and adds the one picked", async () => {
    const { user } = renderApp("/busqueda");

    await user.type(await screen.findByLabelText("Preferidos"), "carol");
    await user.click(await screen.findByRole("option", { name: /La Carolina/ }));

    expect(screen.getByRole("list", { name: "Preferidos agregados" })).toHaveTextContent(
      "La Carolina",
    );
    expect(screen.getByLabelText("Preferidos")).toHaveValue("");
  });

  it("picks a suggestion with the keyboard", async () => {
    const { user } = renderApp("/busqueda");

    await user.type(await screen.findByLabelText("Excluidos"), "car{ArrowDown}{ArrowDown}{Enter}");

    expect(screen.getByRole("list", { name: "Excluidos agregados" })).toHaveTextContent("Carcelén");
  });

  it("refuses a misspelled sector instead of saving it", async () => {
    const { user } = renderApp("/busqueda");

    await user.type(await screen.findByLabelText("Preferidos"), "Carolna{Enter}");

    expect(screen.getByText("Elige un sector de la lista.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Preferidos agregados" })).not.toBeInTheDocument();
  });

  describe("sharing", () => {
    const SHARED = {
      ...SAVED_PROFILE,
      max_monthly_cost_usd: 650,
      max_bedrooms: 3,
      preferred_neighborhoods: ["Cumbayá"],
    };

    function renderWithShare(path: string, share: FakeShareGateway) {
      return renderApp(path, new FakeAuthGateway(SIGNED_IN), undefined, undefined, share);
    }

    it("shares the saved search as a link to this screen", async () => {
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      );
      const share = new FakeShareGateway("shared");
      const { user } = renderWithShare("/busqueda", share);

      await user.click(await screen.findByRole("button", { name: "Compartir búsqueda" }));

      const [link] = share.sharedLinks;
      expect(link?.path.startsWith("/busqueda#")).toBe(true);
      expect(readSharedSearchToken(link?.path.split("#")[1] ?? "")).toBe(
        encodeSharedSearch(SAVED_PROFILE),
      );
    });

    it("tells the user when the link was copied instead of shared", async () => {
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      );
      const { user } = renderWithShare("/busqueda", new FakeShareGateway("copied"));

      await user.click(await screen.findByRole("button", { name: "Compartir búsqueda" }));

      expect(await screen.findByRole("status")).toHaveTextContent("Enlace copiado");
    });

    it("does not offer to share before a search is saved", async () => {
      server.use(
        http.get(
          `${API_BASE_URL}/me/search-profile`,
          () => new HttpResponse(null, { status: 404 }),
        ),
      );
      renderApp("/busqueda");

      expect(await screen.findByLabelText("Máximo al mes (USD)")).toHaveValue("");
      expect(screen.queryByRole("button", { name: "Compartir búsqueda" })).not.toBeInTheDocument();
    });

    it("prefills a received search and saves it over the current one", async () => {
      let saved: SearchProfileInput | null = null;
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
        http.put(`${API_BASE_URL}/me/search-profile`, async ({ request }) => {
          saved = (await request.json()) as SearchProfileInput;
          return HttpResponse.json(SHARED);
        }),
      );
      const { user } = renderApp(`/busqueda#compartida=${encodeSharedSearch(SHARED)}`);

      expect(await screen.findByRole("heading", { name: /compartieron/ })).toBeInTheDocument();
      expect(screen.getByLabelText("Máximo al mes (USD)")).toHaveValue("650");
      expect(screen.getByLabelText("Habitaciones máximas")).toHaveValue("3");
      await user.click(screen.getByRole("button", { name: "Guardar búsqueda" }));

      expect(await screen.findByRole("status")).toHaveTextContent("Búsqueda guardada");
      expect(saved).toMatchObject({
        max_monthly_cost_usd: 650,
        max_bedrooms: 3,
        preferred_neighborhoods: ["Cumbayá"],
        weights: SAVED_PROFILE.weights,
      });
      expect(screen.queryByRole("heading", { name: /compartieron/ })).not.toBeInTheDocument();
    });

    it("goes back to the own search when the received one is discarded", async () => {
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      );
      const { user } = renderApp(`/busqueda#compartida=${encodeSharedSearch(SHARED)}`);

      await user.click(await screen.findByRole("button", { name: "Descartar y ver la mía" }));

      expect(await screen.findByLabelText("Máximo al mes (USD)")).toHaveValue("900");
      expect(screen.queryByRole("heading", { name: /compartieron/ })).not.toBeInTheDocument();
    });

    it("explains a broken link and keeps the own search", async () => {
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
      );
      renderApp("/busqueda#compartida=roto");

      expect(await screen.findByRole("alert")).toHaveTextContent("no es válido");
      expect(screen.getByLabelText("Máximo al mes (USD)")).toHaveValue("900");
    });

    it("opens a search received before signing in once the session starts", async () => {
      sessionStorage.setItem("depazo-pending-shared-search", encodeSharedSearch(SHARED));
      server.use(
        http.get(`${API_BASE_URL}/me/search-profile`, () => HttpResponse.json(SAVED_PROFILE)),
        http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json({ matches: [] })),
      );
      renderApp("/");

      expect(await screen.findByRole("heading", { name: /compartieron/ })).toBeInTheDocument();
      expect(sessionStorage.getItem("depazo-pending-shared-search")).toBeNull();
    });
  });
});
