import { useId } from "react";
import { Button } from "../components/atoms/button";
import { RangeSlider } from "../components/atoms/range-slider";
import { SegmentedControl } from "../components/atoms/segmented-control";
import { Switch } from "../components/atoms/switch";
import { InsetGroup } from "../components/molecules/inset-group";
import { StatusMessage } from "../components/molecules/status-message";
import { TabPage } from "../components/templates/tab-page";
import { explainPushAvailability } from "../format/push-availability";
import { useAppearance } from "../hooks/use-appearance";
import { usePushNotifications } from "../hooks/use-push-notifications";
import { useSignOut } from "../hooks/use-sign-in";
import type { ThemePreference } from "../services/appearance";
import { PushPermissionDeniedError } from "../services/push-gateway";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export function AccountPage({ email }: { email: string }) {
  const signOut = useSignOut();
  const { appearance, update } = useAppearance();
  const tintId = useId();
  const pushLabelId = useId();
  const push = usePushNotifications();
  const pushError = push.enable.error ?? push.disable.error;

  return (
    <TabPage title="Cuenta">
      <InsetGroup title="Sesión">
        <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5">
          <span className="text-body text-label">Email</span>
          <span className="truncate text-body text-label-2">{email}</span>
        </div>
      </InsetGroup>

      <InsetGroup
        title="Apariencia"
        footer="El vidrio de la barra y los botones flotantes puede verse más transparente o más tintado."
      >
        <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-1.5">
          <span className="text-body text-label">Tema</span>
          <SegmentedControl
            label="Tema"
            options={THEME_OPTIONS}
            value={appearance.theme}
            onChange={(theme) => update({ theme })}
          />
        </div>
        <div className="grid gap-0.5 px-4 py-2">
          <label htmlFor={tintId} className="text-body text-label">
            Vidrio
          </label>
          <RangeSlider
            id={tintId}
            label="Apariencia del vidrio: transparente a tintado"
            value={appearance.glassTint}
            onChange={(glassTint) => update({ glassTint })}
          />
          <div aria-hidden="true" className="flex justify-between text-footnote text-label-2">
            <span>Transparente</span>
            <span>Tintado</span>
          </div>
        </div>
      </InsetGroup>

      <InsetGroup title="Notificaciones" footer={explainPushAvailability(push.availability)}>
        <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-1.5">
          <span id={pushLabelId} className="text-body text-label">
            Avisos en este dispositivo
          </span>
          {push.availability === "available" && (
            <Switch
              labelledBy={pushLabelId}
              isChecked={push.isEnabled}
              isDisabled={push.isBusy}
              onCheckedChange={(isChecked) =>
                isChecked ? push.enable.mutate() : push.disable.mutate()
              }
            />
          )}
        </div>
      </InsetGroup>
      {pushError && (
        <StatusMessage
          tone="error"
          message={
            pushError instanceof PushPermissionDeniedError
              ? "No diste permiso para los avisos. Puedes activarlo en los ajustes del navegador."
              : "No pudimos cambiar los avisos. Inténtalo de nuevo."
          }
        />
      )}

      {signOut.isError && (
        <StatusMessage tone="error" message="No pudimos cerrar la sesión. Inténtalo de nuevo." />
      )}
      <Button
        variant="destructive"
        isFullWidth
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        Cerrar sesión
      </Button>
    </TabPage>
  );
}
