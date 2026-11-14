import { Link } from "@tanstack/react-router";
import { Heart, SlidersHorizontal } from "lucide-react";
import { Button, buttonClasses } from "../components/atoms/button";
import { EmptyState } from "../components/molecules/empty-state";
import { StatusMessage } from "../components/molecules/status-message";
import { MatchList, MatchListSkeleton } from "../components/organisms/match-list";
import { TabPage } from "../components/templates/tab-page";
import { describeSavedCount } from "../format/matches-report";
import { useSavedListings, useToggleSaved } from "../hooks/use-listing-reactions";

export function FavoritesPage() {
  const saved = useSavedListings();
  const toggleSaved = useToggleSaved();
  const matches = saved.data;

  return (
    <TabPage title="Favoritos" status={matches ? describeSavedCount(matches.length) : undefined}>
      {saved.isPending && <MatchListSkeleton label="Cargando favoritos" />}
      {saved.isError && (
        <div className="grid gap-3">
          <StatusMessage
            tone="error"
            message="No pudimos cargar tus favoritos. Revisa tu conexión e inténtalo de nuevo."
          />
          <Button variant="secondary" onClick={() => saved.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {saved.isSuccess && matches === null && (
        <EmptyState
          icon={SlidersHorizontal}
          title="Cuéntanos qué buscas"
          message="Configura tu búsqueda para ver anuncios y guardar los que te gusten."
          action={
            <Link to="/busqueda" className={buttonClasses("primary")}>
              Configurar búsqueda
            </Link>
          }
        />
      )}
      {matches && matches.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Aún no tienes favoritos"
          message="Toca el corazón de un anuncio en Para ti y lo guardaremos aquí."
          action={
            <Link to="/" className={buttonClasses("primary")}>
              Ver anuncios para ti
            </Link>
          }
        />
      )}
      {matches && matches.length > 0 && (
        <MatchList
          matches={matches}
          onToggleSaved={(match, isSaved) =>
            toggleSaved.mutate({ listing: match.listing, isSaved })
          }
        />
      )}
      {toggleSaved.isError && (
        <StatusMessage tone="error" message="No pudimos guardar el cambio. Inténtalo de nuevo." />
      )}
    </TabPage>
  );
}
