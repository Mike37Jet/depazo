import { parsePlusvaliaPage, readPlusvaliaPage } from "../sources/plusvalia/parsePlusvaliaPage";
import { buildPageReport } from "../watch/watchMessages";
import { captureWhileBrowsing } from "./captureWhileBrowsing";

async function reportPageToServiceWorker(root: ParentNode, capturedAt: Date): Promise<void> {
  const reading = readPlusvaliaPage(root, capturedAt);
  await chrome.runtime.sendMessage(buildPageReport(reading.cardCount, reading.listings));
}

captureWhileBrowsing(parsePlusvaliaPage, () => true, reportPageToServiceWorker);
