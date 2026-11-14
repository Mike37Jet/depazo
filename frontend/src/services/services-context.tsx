import { createContext, type ReactNode, useContext } from "react";
import type { DepazoApi } from "./api-client";
import type { AppInstaller } from "./app-installer";
import type { AuthGateway } from "./auth-gateway";
import type { PushGateway } from "./push-gateway";
import type { ShareGateway } from "./share-gateway";

export interface AppServices {
  auth: AuthGateway;
  api: DepazoApi;
  push: PushGateway;
  installer: AppInstaller;
  share: ShareGateway;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error("useServices must be used inside ServicesProvider");
  }
  return services;
}
