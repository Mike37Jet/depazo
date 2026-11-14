import { screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { aMatch, aReport } from "../test/api-fixtures";
import { FakeAppInstaller } from "../test/fake-app-installer";
import { FakeAuthGateway, SIGNED_IN } from "../test/fake-auth-gateway";
import { FakePushGateway } from "../test/fake-push-gateway";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

describe("MatchesPage", () => {
  it("shows ranked listings with their score and why", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(
          aReport([aMatch(), aMatch({ external_id: "listing-2", title: "Suite en Cumbayá" }, 64)]),
        );
      }),
    );

    renderApp("/");

    const card = await screen.findByRole("article", {
      name: "Departamento amoblado en La Carolina",
    });
    expect(within(card).getByRole("img", { name: /Compatibilidad 87 de 100/ })).toBeInTheDocument();
    expect(within(card).getByText(/alícuota/)).toBeInTheDocument();
    expect(within(card).getByText("Por qué 87 puntos")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Ver en iCasas/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByText("2 de 10 anuncios encajan con tu búsqueda")).toBeInTheDocument();
    expect(authorization).toBe("Bearer test-token");
  });

  it("invites a new user to set up the search", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () => new HttpResponse(null, { status: 404 })),
    );

    renderApp("/");

    expect(await screen.findByRole("link", { name: "Configurar búsqueda" })).toHaveAttribute(
      "href",
      "/busqueda",
    );
  });

  it("explains that every listing fails the filters", async () => {
    server.use(http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json(aReport([]))));

    renderApp("/");

    expect(await screen.findByText("Ningún anuncio cumple tus filtros")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajustar filtros" })).toHaveAttribute(
      "href",
      "/busqueda",
    );
  });

  it("explains that listings pass the filters but miss the minimum score", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () =>
        HttpResponse.json({ ...aReport([]), rejected_count: 6 }),
      ),
    );

    renderApp("/");

    expect(await screen.findByText("Ninguno llega a tu puntaje mínimo")).toBeInTheDocument();
    expect(screen.getByText(/^4 anuncios cumplen tus filtros/)).toBeInTheDocument();
  });

  it("offers a retry when the api fails", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () => {
        attempts += 1;
        return attempts === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(aReport([aMatch()]));
      }),
    );
    const { user } = renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("article")).toBeInTheDocument();
  });

  it("never renders images or links that are not https", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () =>
        HttpResponse.json(
          aReport([
            aMatch({ url: "javascript:alert(1)", image_url: "http://insecure.test/a.jpg" }),
          ]),
        ),
      ),
    );

    renderApp("/");

    const card = await screen.findByRole("article");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(card.querySelector("img")).toBeNull();
  });

  it("says how many listings match when only the best ones are shown", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () =>
        HttpResponse.json({ ...aReport([aMatch()], 550), match_count: 134 }),
      ),
    );

    renderApp("/");

    expect(
      await screen.findByText("134 de 550 anuncios encajan con tu búsqueda · ves los 1 mejores"),
    ).toBeInTheDocument();
  });

  it("returns to sign-in when the session is no longer accepted", async () => {
    server.use(
      http.get(`${API_BASE_URL}/me/matches`, () => new HttpResponse(null, { status: 401 })),
    );

    renderApp("/", new FakeAuthGateway(SIGNED_IN));

    expect(await screen.findByRole("button", { name: "Enviarme un código" })).toBeInTheDocument();
  });

  it("installs the app from the browser tab", async () => {
    server.use(http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json(aReport([]))));
    const installer = new FakeAppInstaller("prompt");
    const { user } = renderApp(
      "/",
      new FakeAuthGateway(SIGNED_IN),
      new FakePushGateway(),
      installer,
    );

    await user.click(await screen.findByRole("button", { name: "Instalar depazo" }));

    expect(installer.installCount).toBe(1);
    expect(screen.queryByRole("button", { name: "Instalar depazo" })).not.toBeInTheDocument();
  });

  it("explains how to add the app on an iPhone", async () => {
    server.use(http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json(aReport([]))));
    const { user } = renderApp(
      "/",
      new FakeAuthGateway(SIGNED_IN),
      new FakePushGateway(),
      new FakeAppInstaller("manual"),
    );

    await user.click(await screen.findByRole("button", { name: "Instalar depazo" }));

    expect(screen.getByRole("status")).toHaveTextContent("Agregar a inicio");
    await user.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByText(/Agregar a inicio/)).not.toBeInTheDocument();
  });

  it("hides the install button once the app is installed", async () => {
    server.use(http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json(aReport([]))));

    renderApp(
      "/",
      new FakeAuthGateway(SIGNED_IN),
      new FakePushGateway(),
      new FakeAppInstaller("installed"),
    );

    expect(await screen.findByRole("link", { name: "Editar búsqueda" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar depazo" })).not.toBeInTheDocument();
  });
});
