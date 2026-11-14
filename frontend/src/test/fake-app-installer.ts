import type { AppInstaller, InstallAvailability, InstallOutcome } from "../services/app-installer";

export class FakeAppInstaller implements AppInstaller {
  private readonly listeners = new Set<() => void>();
  installCount = 0;

  constructor(private currentAvailability: InstallAvailability = "unavailable") {}

  availability(): InstallAvailability {
    return this.currentAvailability;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async install(): Promise<InstallOutcome> {
    this.installCount += 1;
    this.currentAvailability = "installed";
    for (const listener of this.listeners) {
      listener();
    }
    return "accepted";
  }
}
