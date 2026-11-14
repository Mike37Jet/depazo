import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeDeliveryOutcome,
  mountWatchPanel,
  type WatchPanelPorts,
} from "../../src/popup/watchPanel";
import type { WatchCommand } from "../../src/watch/watchMessages";
import type { WatchState } from "../../src/watch/watchState";
import { aWatchState, DELIVERED, settled, watchingState } from "../watch/watchFakes";

const POPUP_PATH = join(import.meta.dirname, "../../public/popup/popup.html");

class FakeServiceWorker {
  state: WatchState;
  commands: WatchCommand[] = [];
  isFailing = false;

  constructor(state: WatchState) {
    this.state = state;
  }

  get ports(): WatchPanelPorts {
    return {
      loadState: async () => this.state,
      sendCommand: async (command) => {
        if (this.isFailing) {
          throw new Error("the service worker did not answer");
        }
        this.commands.push(command);
        this.state = {
          ...this.state,
          isEnabled: command === "disable" ? false : command === "enable" || this.state.isEnabled,
          attentionReason: command === "resume" ? null : this.state.attentionReason,
        };
      },
      formatDate: (date) => date.toISOString(),
    };
  }
}

function popupDocument(): Document {
  const markup = readFileSync(POPUP_PATH, "utf8");
  const body = markup.slice(markup.indexOf("<body>"), markup.indexOf("</body>"));
  return new DOMParser().parseFromString(body, "text/html");
}

function elementIn<Found extends HTMLElement>(page: Document, selector: string): Found {
  const element = page.querySelector<Found>(selector);
  if (element === null) {
    throw new Error(`${selector} is missing from the popup`);
  }
  return element;
}

async function mountedPopup(state: WatchState): Promise<[Document, FakeServiceWorker]> {
  const page = popupDocument();
  const serviceWorker = new FakeServiceWorker(state);
  await mountWatchPanel(page, serviceWorker.ports).refresh();
  return [page, serviceWorker];
}

function watchSwitchIn(page: Document): HTMLInputElement {
  return elementIn<HTMLInputElement>(page, "#watch-switch");
}

describe("watch panel", () => {
  it("lives outside the four capture states and adds no second primary button", () => {
    const page = popupDocument();

    const panel = elementIn(page, "#watch-panel");

    expect(panel.closest("#loading-state, #empty-state, #ready-state, #error-state")).toBeNull();
    expect(panel.querySelector(".primary-button")).toBeNull();
    expect(page.querySelectorAll(".primary-button")).toHaveLength(1);
  });

  it("labels the switch in Spanish", () => {
    const page = popupDocument();

    expect(elementIn(page, "label[for='watch-switch']").textContent).toContain(
      "Vigilar Plusvalía automáticamente",
    );
  });

  it("shows the switch off by default", async () => {
    const [page] = await mountedPopup(aWatchState());

    expect(watchSwitchIn(page).checked).toBe(false);
    expect(watchSwitchIn(page).disabled).toBe(false);
    expect(elementIn(page, "#watch-status").textContent).toContain("Apagada");
    expect(elementIn(page, "#watch-attention").hidden).toBe(true);
  });

  it("shows the last check and the result of the last delivery", async () => {
    const [page] = await mountedPopup(
      watchingState({
        lastCheckAt: "2026-11-14T15:00:00.000Z",
        lastDelivery: {
          at: "2026-11-14T15:00:05.000Z",
          outcome: { kind: "delivered", newCount: 2, repricedCount: 1, unchangedCount: 27 },
        },
      }),
    );

    expect(watchSwitchIn(page).checked).toBe(true);
    expect(elementIn(page, "#watch-status").textContent).toContain("Vigilando");
    expect(elementIn(page, "#watch-last-check").textContent).toBe(
      "Última revisión: 2026-11-14T15:00:00.000Z.",
    );
    expect(elementIn(page, "#watch-last-delivery").textContent).toBe(
      "Último envío: 2026-11-14T15:00:05.000Z · 2 nuevos, 1 con precio nuevo, 27 sin cambios.",
    );
  });

  it("says so when nothing was checked or delivered yet", async () => {
    const [page] = await mountedPopup(watchingState());

    expect(elementIn(page, "#watch-last-check").textContent).toContain("todavía ninguna");
    expect(elementIn(page, "#watch-last-delivery").textContent).toContain("todavía ninguno");
  });

  it("shows a failed delivery as not delivered", async () => {
    const [page] = await mountedPopup(
      watchingState({
        lastDelivery: { at: "2026-11-14T15:00:05.000Z", outcome: { kind: "disconnected" } },
      }),
    );

    expect(elementIn(page, "#watch-last-delivery").textContent).toContain("no entregado");
  });

  it("explains the stop and offers to resume when the watch needs attention", async () => {
    const [page] = await mountedPopup(watchingState({ attentionReason: "noReport" }));

    expect(elementIn(page, "#watch-attention").hidden).toBe(false);
    expect(elementIn(page, "#watch-status").textContent).toContain("Detenida");
    expect(elementIn(page, "#watch-resume-button").textContent).toBe("Reanudar");
  });

  it("asks the service worker to resume when the owner presses Reanudar", async () => {
    const [page, serviceWorker] = await mountedPopup(
      watchingState({ attentionReason: "noReport" }),
    );

    elementIn(page, "#watch-resume-button").click();
    await settled();

    expect(serviceWorker.commands).toEqual(["resume"]);
    expect(elementIn(page, "#watch-attention").hidden).toBe(true);
  });

  it("asks the service worker to start watching when the switch is turned on", async () => {
    const [page, serviceWorker] = await mountedPopup(aWatchState());

    watchSwitchIn(page).click();
    await settled();

    expect(serviceWorker.commands).toEqual(["enable"]);
    expect(elementIn(page, "#watch-status").textContent).toContain("Vigilando");
  });

  it("asks the service worker to stop watching when the switch is turned off", async () => {
    const [page, serviceWorker] = await mountedPopup(watchingState());

    watchSwitchIn(page).click();
    await settled();

    expect(serviceWorker.commands).toEqual(["disable"]);
    expect(elementIn(page, "#watch-status").textContent).toContain("Apagada");
  });

  it("puts the switch back and says so when the change could not be applied", async () => {
    const [page, serviceWorker] = await mountedPopup(aWatchState());
    serviceWorker.isFailing = true;

    watchSwitchIn(page).click();
    await settled();

    expect(watchSwitchIn(page).checked).toBe(false);
    expect(elementIn(page, "#watch-failure").hidden).toBe(false);
  });
});

describe("describeDeliveryOutcome", () => {
  it.each([
    [DELIVERED, "1 nuevos, 0 con precio nuevo, 0 sin cambios"],
    [{ kind: "rejected", error: "invalid_capture" } as const, "rechazó la captura"],
    [{ kind: "rejected", error: "unavailable" } as const, "no está disponible"],
    [{ kind: "disconnected" } as const, "no respondió"],
    [{ kind: "timedOut" } as const, "tiempo de espera"],
    [{ kind: "invalidReply" } as const, "respuesta no reconocida"],
  ])("describes %o in Spanish", (outcome, expected) => {
    expect(describeDeliveryOutcome(outcome)).toContain(expected);
  });
});
