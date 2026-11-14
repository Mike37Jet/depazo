import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FakeAuthGateway, SIGNED_IN } from "../test/fake-auth-gateway";
import { renderApp } from "../test/render-app";

describe("AccountPage", () => {
  it("shows the account and returns to sign-in after signing out", async () => {
    const { user } = renderApp("/cuenta", new FakeAuthGateway(SIGNED_IN));

    expect(await screen.findByText(SIGNED_IN.email)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("button", { name: "Enviarme un código" })).toBeInTheDocument();
  });
});
