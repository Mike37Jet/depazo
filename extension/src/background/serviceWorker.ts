import {
  chromeAttentionBadge,
  chromeWatchAlarms,
  chromeWatchTabs,
  DELIVERY_ALARM,
  deliverThroughNativeHost,
  ensureWatchCycleAlarm,
  REPORT_DEADLINE_ALARM,
  WATCH_CYCLE_ALARM,
} from "../watch/chromeWatchPorts";
import { createPlusvaliaWatch } from "../watch/plusvaliaWatch";
import { type ClassifiedMessage, classifyMessage, type WatchCommand } from "../watch/watchMessages";
import { createWatchStore } from "../watch/watchStore";

const watch = createPlusvaliaWatch({
  now: () => new Date(),
  isOnline: () => navigator.onLine,
  store: createWatchStore(chrome.storage.local),
  tabs: chromeWatchTabs,
  alarms: chromeWatchAlarms,
  badge: chromeAttentionBadge,
  deliverCapture: deliverThroughNativeHost,
});

function reportFailure(error: unknown): void {
  console.error("depazo watch failed", error);
}

function deliverInBackground(): void {
  watch.deliverPending().catch(reportFailure);
}

async function runCycleThenDeliver(): Promise<void> {
  const outcome = await watch.runCycle();
  if (outcome !== "reload") {
    deliverInBackground();
  }
}

async function prepare(): Promise<void> {
  await ensureWatchCycleAlarm();
  await watch.syncBadge();
}

async function handleAlarm(name: string): Promise<void> {
  if (name === WATCH_CYCLE_ALARM) {
    await runCycleThenDeliver();
  } else if (name === REPORT_DEADLINE_ALARM) {
    await watch.enforceReportDeadline();
  } else if (name === DELIVERY_ALARM) {
    await watch.deliverPending();
  }
}

async function applyCommand(command: WatchCommand): Promise<void> {
  if (command === "resume") {
    await watch.resume();
  } else {
    await watch.setEnabled(command === "enable");
  }
  await runCycleThenDeliver();
}

async function handleMessage(message: ClassifiedMessage): Promise<boolean> {
  if (message.kind === "watchCommand") {
    await applyCommand(message.command);
    return true;
  }
  if (message.kind === "pageReport") {
    const isAccepted = await watch.acceptPageReport(
      message.report,
      message.tabId,
      message.documentId,
    );
    if (isAccepted) {
      deliverInBackground();
    }
    return isAccepted;
  }
  return false;
}

chrome.runtime.onInstalled.addListener(() => {
  prepare().catch(reportFailure);
});

chrome.runtime.onStartup.addListener(() => {
  prepare().catch(reportFailure);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm.name).catch(reportFailure);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  handleMessage(classifyMessage(message, sender, chrome.runtime.id)).then(
    (isHandled) => sendResponse({ isHandled }),
    (error: unknown) => {
      reportFailure(error);
      sendResponse({ isHandled: false });
    },
  );
  return true;
});

ensureWatchCycleAlarm().catch(reportFailure);
