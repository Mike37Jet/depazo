import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { aReport } from "../test/api-fixtures";
import { FakeAuthGateway, VALID_CODE } from "../test/fake-auth-gateway";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

describe("SignInPage", () => {
  it("signs in with the emailed code and opens the matches tab", async () => {
    server.use(http.get(`${API_BASE_URL}/me/matches`, () => HttpResponse.json(aReport([]))));
    const auth = new FakeAuthGateway();
    const { user } = renderApp("/", auth);

    await user.type(await screen.findByLabelText("Email"), "persona@correo.test");
    await user.click(screen.getByRole("button", { name: "Enviarme un código" }));
    await user.type(await screen.findByLabelText("Código"), VALID_CODE);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Para ti" })).toBeInTheDocument();
    expect(auth.requestedCodes).toEqual(["persona@correo.test"]);
  });

  it("explains an invalid email before contacting the server", async () => {
    const auth = new FakeAuthGateway();
    const { user } = renderApp("/", auth);

    await user.type(await screen.findByLabelText("Email"), "persona");
    await user.click(screen.getByRole("button", { name: "Enviarme un código" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe un email válido");
    expect(auth.requestedCodes).toEqual([]);
  });

  it("tells the user when the code is wrong", async () => {
    const { user } = renderApp("/", new FakeAuthGateway());

    await user.type(await screen.findByLabelText("Email"), "persona@correo.test");
    await user.click(screen.getByRole("button", { name: "Enviarme un código" }));
    await user.type(await screen.findByLabelText("Código"), "000000");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("no es válido");
  });
});
