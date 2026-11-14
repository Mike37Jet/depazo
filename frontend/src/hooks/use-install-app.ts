import { useCallback, useSyncExternalStore } from "react";
import { useServices } from "../services/services-context";

export function useInstallApp() {
  const { installer } = useServices();
  const subscribe = useCallback(
    (listener: () => void) => installer.onChange(listener),
    [installer],
  );
  const availability = useSyncExternalStore(subscribe, () => installer.availability());
  return { availability, install: () => installer.install() };
}
