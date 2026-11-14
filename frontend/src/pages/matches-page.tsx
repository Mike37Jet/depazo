import { Link } from "@tanstack/react-router";
import { Download, SearchX, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button, buttonClasses } from "../components/atoms/button";
import { Chip } from "../components/atoms/chip";
import { GLASS_BUTTON_CLASSES, GlassSurface } from "../components/atoms/glass-surface";
import { EmptyState } from "../components/molecules/empty-state";
import { StatusMessage } from "../components/molecules/status-message";
import { Toast } from "../components/molecules/toast";
import { MatchList, MatchListSkeleton } from "../components/organisms/match-list";
import { TabPage } from "../components/templates/tab-page";
import { describeReport, explainEmptyReport } from "../format/matches-report";
import { describeFilters } from "../format/search-profile";
import { useInstallApp } from "../hooks/use-install-app";
import {
  type SavedToggle,
  useDiscardListing,
  useRestoreListing,
  useToggleSaved,
} from "../hooks/use-listing-reactions";
import { useMatches } from "../hooks/use-matches";
import { useSearchProfile } from "../hooks/use-search-profile";
import { useUndoWindow } from "../hooks/use-undo-window";
import type { Match, Matches } from "../services/api-client";

const MATCHES_PER_PAGE = 50;

interface DiscardedListing extends SavedToggle {
  place: string;
}

export function MatchesPage() {
  const matches = useMatches(MATCHES_PER_PAGE);
  const profile = useSearchProfile();
  const toggleSaved = useToggleSaved();
  const discard = useDiscardListing();
  const restore = useRestoreListing();
  const undo = useUndoWindow<DiscardedListing>();
  const installApp = useInstallApp();
  const [isInstallHintVisible, setIsInstallHintVisible] = useState(false);
  const report = matches.data;
  const canOfferInstall =
    installApp.availability === "prompt" || installApp.availability === "manual";

  const startInstall = () => {
    if (installApp.availability === "manual") {
      setIsInstallHintVisible(true);
      return;
    }
    void installApp.install();
  };
  const filters = profile.data ? describeFilters(profile.data) : [];

  const discardMatch = (match: Match) => {
    discard.mutate(match.listing);
    undo.open({
      listing: match.listing,
      isSaved: match.is_saved,
      place: match.listing.neighborhood ?? match.listing.title,
    });
  };

  const undoDiscard = () => {
    if (undo.item) {
      restore.mutate({ listing: undo.item.listing, isSaved: undo.item.isSaved });
    }
    undo.close();
  };

  return (
    <TabPage
      title="Para ti"
      status={report ? describeReport(report) : undefined}
      actions={
        <GlassSurface>
          {canOfferInstall && (
            <button
              type="button"
              aria-label="Instalar depazo"
              onClick={startInstall}
              className={GLASS_BUTTON_CLASSES}
            >
              <Download aria-hidden="true" />
            </button>
          )}
          <Link to="/busqueda" aria-label="Editar búsqueda" className={GLASS_BUTTON_CLASSES}>
            <SlidersHorizontal aria-hidden="true" />
          </Link>
        </GlassSurface>
      }
    >
      {filters.length > 0 && (
        <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <li key={filter.label}>
              <Chip label={filter.label} isActive={filter.isPrimary} />
            </li>
          ))}
        </ul>
      )}
      {matches.isPending && <MatchListSkeleton label="Cargando coincidencias" />}
      {matches.isError && (
        <div className="grid gap-3">
          <StatusMessage
            tone="error"
            message="No pudimos cargar tus coincidencias. Revisa tu conexión e inténtalo de nuevo."
          />
          <Button variant="secondary" onClick={() => matches.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {matches.isSuccess && report === null && (
        <EmptyState
          icon={SlidersHorizontal}
          title="Cuéntanos qué buscas"
          message="Configura tu presupuesto y los sectores que te interesan para ver anuncios ordenados por compatibilidad."
          action={
            <Link to="/busqueda" className={buttonClasses("primary")}>
              Configurar búsqueda
            </Link>
          }
        />
      )}
      {report && report.matches.length === 0 && (
        <EmptyReport report={report} minScore={profile.data?.min_score} />
      )}
      {report && report.matches.length > 0 && (
        <MatchList
          matches={report.matches}
          onToggleSaved={(match, isSaved) =>
            toggleSaved.mutate({ listing: match.listing, isSaved })
          }
          onDiscard={discardMatch}
        />
      )}
      {(toggleSaved.isError || discard.isError || restore.isError) && (
        <StatusMessage tone="error" message="No pudimos guardar el cambio. Inténtalo de nuevo." />
      )}
      {isInstallHintVisible && !undo.item && (
        <Toast
          message="Toca Compartir y luego «Agregar a inicio»"
          actionLabel="Entendido"
          onAction={() => setIsInstallHintVisible(false)}
        />
      )}
      {undo.item && (
        <Toast
          message={`Descartado: ${undo.item.place}`}
          actionLabel="Deshacer"
          onAction={undoDiscard}
        />
      )}
    </TabPage>
  );
}

function EmptyReport({ report, minScore }: { report: Matches; minScore: number | undefined }) {
  const explanation = explainEmptyReport(report, minScore);
  return (
    <EmptyState
      icon={SearchX}
      title={explanation.title}
      message={explanation.message}
      action={
        <Link to="/busqueda" className={buttonClasses("primary")}>
          {explanation.actionLabel}
        </Link>
      }
    />
  );
}
