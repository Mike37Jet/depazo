import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { SearchProfileInput } from "../services/api-client";
import { SAVED_PROFILE } from "../test/api-fixtures";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

describe("SearchProfilePage", () => {
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
});
