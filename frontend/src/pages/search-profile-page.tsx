import { Button } from "../components/atoms/button";
import { Skeleton } from "../components/atoms/skeleton";
import { StatusMessage } from "../components/molecules/status-message";
import { SearchProfileForm } from "../components/organisms/search-profile-form";
import { TabPage } from "../components/templates/tab-page";
import { useNeighborhoods } from "../hooks/use-neighborhoods";
import { useSaveSearchProfile, useSearchProfile } from "../hooks/use-search-profile";
import {
  useDismissSharedSearch,
  useReceivedSharedSearch,
  useShareSearch,
} from "../hooks/use-shared-search";

const SHARE_MESSAGES = {
  copied: { tone: "success", message: "Enlace copiado. Pégalo en WhatsApp o donde quieras." },
  unavailable: {
    tone: "error",
    message: "Este dispositivo no permite compartir ni copiar el enlace.",
  },
} as const;

export function SearchProfilePage() {
  const profile = useSearchProfile();
  const save = useSaveSearchProfile();
  const neighborhoods = useNeighborhoods();
  const received = useReceivedSharedSearch();
  const dismissReceived = useDismissSharedSearch();
  const share = useShareSearch();
  const shareMessage =
    share.data === "copied" || share.data === "unavailable" ? SHARE_MESSAGES[share.data] : null;

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
      {profile.isSuccess && received.status === "invalid" && (
        <StatusMessage
          tone="error"
          message="El enlace de búsqueda compartida no es válido. Pide que te lo envíen de nuevo."
        />
      )}
      {profile.isSuccess && received.status === "ready" && (
        <section
          aria-label="Búsqueda compartida"
          className="flex flex-col gap-2 rounded-md bg-surface px-4 py-3"
        >
          <h2 className="text-headline text-label">Te compartieron una búsqueda</h2>
          <p className="text-subhead text-label-2">
            Revísala y pulsa Guardar búsqueda para usarla. Reemplazará la que tienes ahora.
          </p>
          <Button variant="plain" onClick={() => dismissReceived()}>
            Descartar y ver la mía
          </Button>
        </section>
      )}
      {profile.isSuccess && (
        <SearchProfileForm
          key={received.status === "ready" ? received.token : "own"}
          profile={profile.data}
          draft={received.status === "ready" ? received.search : undefined}
          isSaving={save.isPending}
          status={status}
          neighborhoodOptions={neighborhoods.data}
          onSave={(input) =>
            save.mutate(input, {
              onSuccess: () => (received.status === "none" ? undefined : dismissReceived()),
            })
          }
        />
      )}
      {profile.isSuccess && profile.data && received.status !== "ready" && (
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            isFullWidth
            disabled={share.isPending}
            onClick={() => profile.data && share.mutate(profile.data)}
          >
            Compartir búsqueda
          </Button>
          {shareMessage && (
            <StatusMessage tone={shareMessage.tone} message={shareMessage.message} />
          )}
        </div>
      )}
    </TabPage>
  );
}
