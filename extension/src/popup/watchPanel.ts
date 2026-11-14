import type { DeliveryErrorCode, DeliveryOutcome } from "../watch/nativeDelivery";
import type { WatchCommand } from "../watch/watchMessages";
import { hasCatchUpPagesLeft, LAST_CATCH_UP_PAGE } from "../watch/watchSchedule";
import { needsAttention, type WatchState } from "../watch/watchState";

export interface WatchPanelPorts {
  loadState(): Promise<WatchState>;
  sendCommand(command: WatchCommand): Promise<void>;
  formatDate(date: Date): string;
}

export interface WatchPanel {
  refresh(): Promise<void>;
}

const STATUS_OFF = "Apagada. Solo se guardan los anuncios que ves tú.";
const STATUS_WATCHING = "Vigilando cada 20 minutos, de 07:00 a 22:00, con Chrome abierto.";
const STATUS_STOPPED = "Detenida hasta que la reanudes.";
const NEVER_CHECKED = "Última revisión: todavía ninguna.";
const NEVER_DELIVERED = "Último envío: todavía ninguno.";
const REJECTION_LABELS: Readonly<Record<DeliveryErrorCode, string>> = {
  invalid_capture: "el receptor rechazó la captura",
  unavailable: "el receptor no está disponible",
};

function requiredElement<Found extends Element>(root: ParentNode, selector: string): Found {
  const element = root.querySelector<Found>(selector);
  if (element === null) {
    throw new Error(`popup element ${selector} is missing`);
  }
  return element;
}

export function describeWatchStatus(state: WatchState): string {
  if (!state.isEnabled) {
    return STATUS_OFF;
  }
  return needsAttention(state) ? STATUS_STOPPED : STATUS_WATCHING;
}

export function describeDeliveryOutcome(outcome: DeliveryOutcome): string {
  switch (outcome.kind) {
    case "delivered":
      return `${outcome.newCount} nuevos, ${outcome.repricedCount} con precio nuevo, ${outcome.unchangedCount} sin cambios`;
    case "rejected":
      return `no entregado: ${REJECTION_LABELS[outcome.error]}`;
    case "disconnected":
      return "no entregado: el receptor no respondió; se reintentará";
    case "timedOut":
      return "no entregado: se agotó el tiempo de espera; se reintentará";
    case "invalidReply":
      return "no entregado: respuesta no reconocida del receptor";
  }
}

export function describeCatchUp(state: WatchState): string {
  return hasCatchUpPagesLeft(state)
    ? `Poniéndose al día con anuncios anteriores: página ${state.nextCatchUpPage} de ${LAST_CATCH_UP_PAGE}.`
    : `Anuncios anteriores al día: se recorrieron las primeras ${LAST_CATCH_UP_PAGE} páginas.`;
}

export function describeLastCheck(state: WatchState, formatDate: (date: Date) => string): string {
  return state.lastCheckAt === null
    ? NEVER_CHECKED
    : `Última revisión: ${formatDate(new Date(state.lastCheckAt))}.`;
}

export function describeLastDelivery(
  state: WatchState,
  formatDate: (date: Date) => string,
): string {
  if (state.lastDelivery === null) {
    return NEVER_DELIVERED;
  }
  const deliveredAt = formatDate(new Date(state.lastDelivery.at));
  return `Último envío: ${deliveredAt} · ${describeDeliveryOutcome(state.lastDelivery.outcome)}.`;
}

export function mountWatchPanel(root: ParentNode, ports: WatchPanelPorts): WatchPanel {
  const watchSwitch = requiredElement<HTMLInputElement>(root, "#watch-switch");
  const status = requiredElement<HTMLElement>(root, "#watch-status");
  const catchUp = requiredElement<HTMLElement>(root, "#watch-catch-up");
  const lastCheck = requiredElement<HTMLElement>(root, "#watch-last-check");
  const lastDelivery = requiredElement<HTMLElement>(root, "#watch-last-delivery");
  const failure = requiredElement<HTMLElement>(root, "#watch-failure");
  const attention = requiredElement<HTMLElement>(root, "#watch-attention");
  const resumeButton = requiredElement<HTMLButtonElement>(root, "#watch-resume-button");

  function show(state: WatchState): void {
    watchSwitch.checked = state.isEnabled;
    watchSwitch.disabled = false;
    status.textContent = describeWatchStatus(state);
    catchUp.textContent = describeCatchUp(state);
    catchUp.hidden = !state.isEnabled;
    lastCheck.textContent = describeLastCheck(state, ports.formatDate);
    lastDelivery.textContent = describeLastDelivery(state, ports.formatDate);
    attention.hidden = !(state.isEnabled && needsAttention(state));
  }

  async function refresh(): Promise<void> {
    show(await ports.loadState());
  }

  async function send(command: WatchCommand): Promise<void> {
    failure.hidden = true;
    try {
      await ports.sendCommand(command);
    } catch (error) {
      console.error("depazo could not update the watch", error);
      failure.hidden = false;
    }
    await refresh();
  }

  function reportFailure(error: unknown): void {
    console.error("depazo could not show the watch state", error);
    failure.hidden = false;
  }

  watchSwitch.addEventListener("change", () => {
    send(watchSwitch.checked ? "enable" : "disable").catch(reportFailure);
  });
  resumeButton.addEventListener("click", () => {
    send("resume").catch(reportFailure);
  });

  return { refresh };
}
