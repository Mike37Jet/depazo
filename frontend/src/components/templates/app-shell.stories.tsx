import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { Download, Heart, Search, SlidersHorizontal, Star, User } from "lucide-react";
import type { ReactNode } from "react";
import { describeFilters } from "../../format/search-profile";
import { aMatch, SAVED_PROFILE } from "../../test/api-fixtures";
import { Chip } from "../atoms/chip";
import { GLASS_BUTTON_CLASSES, GlassSurface } from "../atoms/glass-surface";
import { MatchList } from "../organisms/match-list";
import type { TabItem } from "../organisms/tab-bar";
import { AppShell } from "./app-shell";
import { TabPage } from "./tab-page";

const TABS: TabItem[] = [
  { to: "/", label: "Para ti", icon: Star },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/busqueda", label: "Búsqueda", icon: Search },
  { to: "/cuenta", label: "Cuenta", icon: User },
];

function WithRouter({ children }: { children: ReactNode }) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => children }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
}

function MatchesScreen() {
  return (
    <WithRouter>
      <AppShell tabs={TABS}>
        <TabPage
          title="Para ti"
          status="2 de 10 anuncios encajan con tu búsqueda"
          actions={
            <GlassSurface>
              <button type="button" aria-label="Instalar depazo" className={GLASS_BUTTON_CLASSES}>
                <Download aria-hidden="true" />
              </button>
              <button type="button" aria-label="Editar búsqueda" className={GLASS_BUTTON_CLASSES}>
                <SlidersHorizontal aria-hidden="true" />
              </button>
            </GlassSurface>
          }
        >
          <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
            {describeFilters(SAVED_PROFILE).map((filter) => (
              <li key={filter.label}>
                <Chip label={filter.label} isActive={filter.isPrimary} />
              </li>
            ))}
          </ul>
          <MatchList
            matches={[
              { ...aMatch(), is_saved: true },
              aMatch({ external_id: "second", neighborhood: "Cumbayá" }, 72),
            ]}
            onToggleSaved={() => undefined}
            onDiscard={() => undefined}
          />
        </TabPage>
      </AppShell>
    </WithRouter>
  );
}

const meta = {
  component: MatchesScreen,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MatchesScreen>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Matches: Story = {};
