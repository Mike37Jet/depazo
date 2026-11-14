export type InstallAvailability = "prompt" | "manual" | "installed" | "unavailable";
export type InstallOutcome = "accepted" | "dismissed";

export interface AppInstaller {
  availability(): InstallAvailability;
  onChange(listener: () => void): () => void;
  install(): Promise<InstallOutcome>;
}
