import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app";
import { createAppRouter } from "../routes/router";
import { createDepazoApi } from "../services/api-client";
import type { AppInstaller } from "../services/app-installer";
import type { AuthGateway } from "../services/auth-gateway";
import type { PushGateway } from "../services/push-gateway";
import type { ShareGateway } from "../services/share-gateway";
import { FakeAppInstaller } from "./fake-app-installer";
import { FakeAuthGateway, SIGNED_IN } from "./fake-auth-gateway";
import { FakePushGateway } from "./fake-push-gateway";
import { FakeShareGateway } from "./fake-share-gateway";
import { API_BASE_URL } from "./server";

export function renderApp(
  path: string,
  auth: AuthGateway = new FakeAuthGateway(SIGNED_IN),
  push: PushGateway = new FakePushGateway(),
  installer: AppInstaller = new FakeAppInstaller(),
  share: ShareGateway = new FakeShareGateway(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const services = { auth, api: createDepazoApi(API_BASE_URL, auth), push, installer, share };
  const user = userEvent.setup();
  render(<App services={services} queryClient={queryClient} router={router} />);
  return { user, router };
}
