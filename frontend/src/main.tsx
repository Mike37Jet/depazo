import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { applyStoredAppearance } from "./hooks/use-appearance";
import { createAppRouter } from "./routes/router";
import { createDepazoApi } from "./services/api-client";
import { BrowserAppInstaller } from "./services/browser-app-installer";
import { BrowserPushGateway } from "./services/browser-push-gateway";
import { BrowserShareGateway } from "./services/browser-share-gateway";
import { readConfig } from "./services/config";
import { SupabaseAuthGateway } from "./services/supabase-auth-gateway";
import "./styles/index.css";

const STALE_AFTER_MILLISECONDS = 60_000;

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("missing #root element");
}

applyStoredAppearance();

const config = readConfig(import.meta.env);
const auth = new SupabaseAuthGateway(config.supabaseUrl, config.supabasePublishableKey);
const services = {
  auth,
  api: createDepazoApi(config.apiBaseUrl, auth),
  push: new BrowserPushGateway(config.vapidPublicKey),
  installer: new BrowserAppInstaller(),
  share: new BrowserShareGateway(),
};
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: STALE_AFTER_MILLISECONDS, retry: 1 } },
});

createRoot(rootElement).render(
  <StrictMode>
    <App services={services} queryClient={queryClient} router={createAppRouter()} />
  </StrictMode>,
);
