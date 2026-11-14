import { Link } from "@tanstack/react-router";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Button, buttonClasses } from "../components/atoms/button";
import { Chip } from "../components/atoms/chip";
import { GLASS_BUTTON_CLASSES, GlassSurface } from "../components/atoms/glass-surface";
import { Skeleton } from "../components/atoms/skeleton";
import { EmptyState } from "../components/molecules/empty-state";
import { StatusMessage } from "../components/molecules/status-message";
import { MatchCard } from "../components/organisms/match-card";
import { TabPage } from "../components/templates/tab-page";
import { explainEmptyReport } from "../format/matches-report";
import { describeFilters } from "../format/search-profile";
import { useMatches } from "../hooks/use-matches";
import { useSearchProfile } from "../hooks/use-search-profile";
import type { Matches } from "../services/api-client";

const MATCHES_PER_PAGE = 50;

export function MatchesPage() {
  const matches = useMatches(MATCHES_PER_PAGE);
  const profile = useSearchProfile();
  const report = matches.data;
  const filters = profile.data ? describeFilters(profile.data) : [];

  return (
    <TabPage
      title="Para ti"
      status={report ? describeReport(report) : undefined}
      actions={
        <GlassSurface>
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
      {matches.isPending && <MatchesSkeleton />}
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
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {report.matches.map((match) => (
            <li key={`${match.listing.source}-${match.listing.external_id}`}>
              <MatchCard match={match} />
            </li>
          ))}
        </ul>
      )}
    </TabPage>
  );
}

function describeReport(report: Matches): string {
  const summary = `${report.match_count} de ${report.evaluated_count} anuncios encajan con tu búsqueda`;
  return report.match_count > report.matches.length
    ? `${summary} · ves los ${report.matches.length} mejores`
    : summary;
}

function MatchesSkeleton() {
  return (
    <div role="status" aria-label="Cargando coincidencias" className="grid gap-4 md:grid-cols-2">
      {["first", "second", "third"].map((key) => (
        <div key={key} className="grid overflow-hidden rounded-lg bg-surface">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="grid gap-2 p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
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
