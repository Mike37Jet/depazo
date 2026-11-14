import { Button } from "../components/atoms/button";
import { Skeleton } from "../components/atoms/skeleton";
import { StatusMessage } from "../components/molecules/status-message";
import { SearchProfileForm } from "../components/organisms/search-profile-form";
import { TabPage } from "../components/templates/tab-page";
import { useNeighborhoods } from "../hooks/use-neighborhoods";
import { useSaveSearchProfile, useSearchProfile } from "../hooks/use-search-profile";

export function SearchProfilePage() {
  const profile = useSearchProfile();
  const save = useSaveSearchProfile();
  const neighborhoods = useNeighborhoods();

  const status = save.isSuccess
    ? { tone: "success" as const, message: "Búsqueda guardada. Tus coincidencias ya están al día." }
    : save.isError
      ? {
          tone: "error" as const,
          message: "No pudimos guardar tu búsqueda. Revisa los datos e inténtalo de nuevo.",
        }
      : null;

  return (
    <TabPage title="Búsqueda" subtitle="Lo que debe cumplir un departamento para mostrártelo.">
      {profile.isPending && (
        <div role="status" aria-label="Cargando tu búsqueda" className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {profile.isError && (
        <div className="flex flex-col gap-3">
          <StatusMessage tone="error" message="No pudimos cargar tu búsqueda guardada." />
          <Button variant="secondary" onClick={() => profile.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {profile.isSuccess && (
        <SearchProfileForm
          profile={profile.data}
          isSaving={save.isPending}
          status={status}
          neighborhoodOptions={neighborhoods.data}
          onSave={(input) => save.mutate(input)}
        />
      )}
    </TabPage>
  );
}
