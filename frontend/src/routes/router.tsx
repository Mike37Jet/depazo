import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { AccountPage } from "../pages/account-page";
import { AppRoot, useSignedInSession } from "../pages/app-root";
import { MatchesPage } from "../pages/matches-page";
import { SearchProfilePage } from "../pages/search-profile-page";

const rootRoute = createRootRoute({ component: AppRoot });

const matchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MatchesPage,
});

const searchProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/busqueda",
  component: SearchProfilePage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cuenta",
  component: SignedInAccountPage,
});

function SignedInAccountPage() {
  return <AccountPage email={useSignedInSession().email} />;
}

const routeTree = rootRoute.addChildren([matchesRoute, searchProfileRoute, accountRoute]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
