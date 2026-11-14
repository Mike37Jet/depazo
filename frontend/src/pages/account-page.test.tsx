import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { FakeAuthGateway, SIGNED_IN } from "../test/fake-auth-gateway";
import { FakePushGateway, TEST_DEVICE } from "../test/fake-push-gateway";
import { renderApp } from "../test/render-app";
import { API_BASE_URL, server } from "../test/server";

function recordPushRequests(): Array<{ method: string; body: unknown }> {
  const requests: Array<{ method: string; body: unknown }> = [];
  const record = async ({ request }: { request: Request }) => {
    requests.push({ method: request.method, body: await request.json() });
    return new HttpResponse(null, { status: 204 });
  };
  server.use(
    http.put(`${API_BASE_URL}/me/push-subscription`, record),
    http.delete(`${API_BASE_URL}/me/push-subscription`, record),
  );
  return requests;
}

describe("AccountPage", () => {
  it("shows the account and returns to sign-in after signing out", async () => {
    const { user } = renderApp("/cuenta", new FakeAuthGateway(SIGNED_IN));

    expect(await screen.findByText(SIGNED_IN.email)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("button", { name: "Enviarme un código" })).toBeInTheDocument();
  });

  it("turns push notifications on and off for this device", async () => {
    const requests = recordPushRequests();
    const { user } = renderApp("/cuenta", new FakeAuthGateway(SIGNED_IN), new FakePushGateway());

    const toggle = await screen.findByRole("switch", { name: "Avisos en este dispositivo" });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(requests).toEqual([
      { method: "PUT", body: { endpoint: TEST_DEVICE.endpoint, keys: TEST_DEVICE.keys } },
      { method: "DELETE", body: { endpoint: TEST_DEVICE.endpoint } },
    ]);
  });

  it("explains how to allow notifications when the user declines", async () => {
    const { user } = renderApp(
      "/cuenta",
      new FakeAuthGateway(SIGNED_IN),
      new FakePushGateway("available", false),
    );

    const toggle = await screen.findByRole("switch", { name: "Avisos en este dispositivo" });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);

    expect(await screen.findByText(/No diste permiso para los avisos/)).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("asks iPhone users to install the app before enabling notifications", async () => {
    renderApp("/cuenta", new FakeAuthGateway(SIGNED_IN), new FakePushGateway("needs-install"));

    expect(await screen.findByText(/agrega depazo a la pantalla de inicio/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
