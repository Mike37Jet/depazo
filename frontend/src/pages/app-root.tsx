import { Outlet } from "@tanstack/react-router";
import { Heart, Search, Star, User } from "lucide-react";
import { createContext, useContext } from "react";
import type { TabItem } from "../components/organisms/tab-bar";
import { AppShell } from "../components/templates/app-shell";
import { useSession } from "../hooks/use-session";
import type { Session } from "../services/auth-gateway";
import { SignInPage } from "./sign-in-page";

const TABS: TabItem[] = [
  { to: "/", label: "Para ti", icon: Star },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/busqueda", label: "Búsqueda", icon: Search },
  { to: "/cuenta", label: "Cuenta", icon: User },
];

const SessionContext = createContext<Session | null>(null);

export function useSignedInSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSignedInSession must be used inside a signed-in AppRoot");
  }
  return session;
}

export function AppRoot() {
  const state = useSession();
  if (state.status === "loading") {
    return <div role="status" aria-label="Cargando" className="min-h-dvh" />;
  }
  if (state.status === "signed-out") {
    return <SignInPage />;
  }
  return (
    <SessionContext.Provider value={state.session}>
      <AppShell tabs={TABS}>
        <Outlet />
      </AppShell>
    </SessionContext.Provider>
  );
}
