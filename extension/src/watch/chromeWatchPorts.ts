import type { CaptureExport } from "../capture/capturedListing";
import {
  type DeliveryOutcome,
  exchangeWithNativeHost,
  NATIVE_HOST_NAME,
  type NativeHostPort,
} from "./nativeDelivery";
import type { AttentionBadge, WatchAlarms, WatchTab, WatchTabs } from "./plusvaliaWatch";
import { WATCH_PERIOD_MINUTES, WATCH_TAB_URL_PREFIX } from "./watchSchedule";

export const WATCH_CYCLE_ALARM = "watchCycle";
export const REPORT_DEADLINE_ALARM = "watchReportDeadline";
export const DELIVERY_ALARM = "watchDelivery";

const ATTENTION_BADGE_TEXT = "!";
const ATTENTION_BADGE_COLOR = "#d70015";

export const chromeWatchTabs: WatchTabs = {
  async find(tabId: number): Promise<WatchTab | null> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab.id === undefined ? null : { id: tab.id, url: tab.url };
    } catch {
      return null;
    }
  },

  async findExisting(): Promise<WatchTab | null> {
    const tabs = await chrome.tabs.query({ pinned: true, url: `${WATCH_TAB_URL_PREFIX}*` });
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        return { id: tab.id, url: tab.url };
      }
    }
    return null;
  },

  async hasWindow(): Promise<boolean> {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
    return windows.length > 0;
  },

  async open(url: string): Promise<number> {
    const tab = await chrome.tabs.create({ url, pinned: true, active: false });
    if (tab.id === undefined) {
      throw new Error("the watch tab was created without an identifier");
    }
    await chrome.tabs.update(tab.id, { autoDiscardable: false });
    return tab.id;
  },

  async reload(tabId: number): Promise<void> {
    await chrome.tabs.update(tabId, { autoDiscardable: false });
    await chrome.tabs.reload(tabId);
  },
};

export const chromeWatchAlarms: WatchAlarms = {
  scheduleReportDeadline: (at: Date) =>
    chrome.alarms.create(REPORT_DEADLINE_ALARM, { when: at.getTime() }),
  scheduleDelivery: (at: Date) => chrome.alarms.create(DELIVERY_ALARM, { when: at.getTime() }),
};

export async function ensureWatchCycleAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(WATCH_CYCLE_ALARM);
  if (existing?.periodInMinutes !== WATCH_PERIOD_MINUTES) {
    await chrome.alarms.create(WATCH_CYCLE_ALARM, { periodInMinutes: WATCH_PERIOD_MINUTES });
  }
}

export const chromeAttentionBadge: AttentionBadge = {
  async show(): Promise<void> {
    await chrome.action.setBadgeBackgroundColor({ color: ATTENTION_BADGE_COLOR });
    await chrome.action.setBadgeText({ text: ATTENTION_BADGE_TEXT });
  },
  clear: () => chrome.action.setBadgeText({ text: "" }),
};

function connectToNativeHost(): NativeHostPort {
  const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  return {
    send: (message) => port.postMessage(message),
    close: () => port.disconnect(),
    onReply: (listener) => port.onMessage.addListener((reply: unknown) => listener(reply)),
    onClosed: (listener) =>
      port.onDisconnect.addListener(() => {
        const reason = chrome.runtime.lastError?.message;
        if (reason !== undefined) {
          console.error("depazo capture host disconnected", reason);
        }
        listener();
      }),
  };
}

export function deliverThroughNativeHost(capture: CaptureExport): Promise<DeliveryOutcome> {
  return exchangeWithNativeHost(
    {
      connect: connectToNativeHost,
      startTimeout: (onTimeout, milliseconds) => {
        const timeout = setTimeout(onTimeout, milliseconds);
        return () => clearTimeout(timeout);
      },
    },
    capture,
  );
}
