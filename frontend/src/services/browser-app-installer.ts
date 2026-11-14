import type { AppInstaller, InstallAvailability, InstallOutcome } from "./app-installer";

const APPLE_MOBILE_DEVICE = /iPhone|iPad|iPod/;

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
}

export class BrowserAppInstaller implements AppInstaller {
  private pendingPrompt: InstallPromptEvent | null = null;
  private isInstalled = isRunningInstalled();
  private readonly listeners = new Set<() => void>();

  constructor() {
    globalThis.addEventListener("beforeinstallprompt", (event) => {
      if (isInstallPromptEvent(event)) {
        event.preventDefault();
        this.pendingPrompt = event;
        this.notify();
      }
    });
    globalThis.addEventListener("appinstalled", () => {
      this.pendingPrompt = null;
      this.isInstalled = true;
      this.notify();
    });
  }

  availability(): InstallAvailability {
    if (this.isInstalled) {
      return "installed";
    }
    if (this.pendingPrompt) {
      return "prompt";
    }
    return APPLE_MOBILE_DEVICE.test(navigator.userAgent) ? "manual" : "unavailable";
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async install(): Promise<InstallOutcome> {
    const installPrompt = this.pendingPrompt;
    if (!installPrompt) {
      return "dismissed";
    }
    this.pendingPrompt = null;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    this.notify();
    return choice.outcome;
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function" && "userChoice" in event;
}

function isRunningInstalled(): boolean {
  const isAppleStandalone = "standalone" in navigator && navigator.standalone === true;
  return isAppleStandalone || globalThis.matchMedia("(display-mode: standalone)").matches;
}
