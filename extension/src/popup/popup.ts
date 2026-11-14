import { buildCaptureExport, countBySource, exportFileName } from "../capture/captureCollection";
import type { CapturedListing, CaptureSource } from "../capture/capturedListing";
import { clearCaptures, loadCaptures } from "../capture/chromeCaptureStorage";
import { buildWatchCommandMessage, watchCommandReplySchema } from "../watch/watchMessages";
import { loadWatchState, WATCH_STATE_KEY } from "../watch/watchStore";
import { mountWatchPanel } from "./watchPanel";

type PopupState = "loading" | "empty" | "ready" | "error";

const POPUP_STATES: readonly PopupState[] = ["loading", "empty", "ready", "error"];
const CLEAR_CONFIRMATION =
  "¿Borrar todos los anuncios guardados? Esta acción no se puede deshacer.";
const SOURCE_LABELS: Readonly<Record<CaptureSource, string>> = {
  plusvalia: "Plusvalía",
  marketplace: "Marketplace",
};
const DATE_FORMAT = new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" });

function elementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`popup element #${id} is missing`);
  }
  return element;
}

function showState(state: PopupState): void {
  for (const candidate of POPUP_STATES) {
    elementById(`${candidate}-state`).hidden = candidate !== state;
  }
}

function latestCaptureDate(listings: readonly CapturedListing[]): Date | null {
  const latest = listings
    .map((listing) => listing.capturedAt)
    .sort()
    .at(-1);
  return latest === undefined ? null : new Date(latest);
}

function describeSources(listings: readonly CapturedListing[]): string {
  return [...countBySource(listings)]
    .map(([source, count]) => `${SOURCE_LABELS[source]} ${count}`)
    .join(" · ");
}

function downloadExport(listings: readonly CapturedListing[]): void {
  const exportedAt = new Date();
  const content = JSON.stringify(buildCaptureExport(listings, exportedAt), null, 2);
  const objectUrl = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = exportFileName(exportedAt);
  link.click();
  URL.revokeObjectURL(objectUrl);
}

async function clearAfterConfirmation(): Promise<void> {
  if (window.confirm(CLEAR_CONFIRMATION)) {
    await clearCaptures();
    await render();
  }
}

async function render(): Promise<void> {
  showState("loading");
  const listings = await loadCaptures();
  if (listings.length === 0) {
    showState("empty");
    return;
  }
  elementById("listing-count").textContent = String(listings.length);
  elementById("source-breakdown").textContent = describeSources(listings);
  const latest = latestCaptureDate(listings);
  elementById("last-capture").textContent =
    latest === null ? "" : `Última captura: ${DATE_FORMAT.format(latest)}`;
  elementById("export-button").onclick = () => downloadExport(listings);
  showState("ready");
}

function reportFailure(error: unknown): void {
  console.error("depazo popup failed", error);
  showState("error");
}

function runSafely(action: () => Promise<void>): () => void {
  return () => {
    action().catch(reportFailure);
  };
}

function reportWatchFailure(error: unknown): void {
  console.error("depazo popup could not show the watch state", error);
  elementById("watch-failure").hidden = false;
}

const watchPanel = mountWatchPanel(document, {
  loadState: () => loadWatchState(chrome.storage.local),
  sendCommand: async (command) => {
    const reply: unknown = await chrome.runtime.sendMessage(buildWatchCommandMessage(command));
    if (!watchCommandReplySchema.safeParse(reply).success) {
      throw new Error("the service worker did not apply the watch command");
    }
  },
  formatDate: (date) => DATE_FORMAT.format(date),
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && WATCH_STATE_KEY in changes) {
    watchPanel.refresh().catch(reportWatchFailure);
  }
});
watchPanel.refresh().catch(reportWatchFailure);
elementById("clear-button").onclick = runSafely(clearAfterConfirmation);
elementById("reset-button").onclick = runSafely(clearAfterConfirmation);
render().catch(reportFailure);
