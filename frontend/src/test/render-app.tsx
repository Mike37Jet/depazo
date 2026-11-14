import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app";
import { createAppRouter } from "../routes/router";
import { createDepazoApi } from "../services/api-client";
import type { AuthGateway } from "../services/auth-gateway";
import { FakeAuthGateway, SIGNED_IN } from "./fake-auth-gateway";
import { API_BASE_URL } from "./server";

export function renderApp(path: string, auth: AuthGateway = new FakeAuthGateway(SIGNED_IN)) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const services = { auth, api: createDepazoApi(API_BASE_URL, auth) };
  const user = userEvent.setup();
  render(<App services={services} queryClient={queryClient} router={router} />);
  return { user, router };
}
