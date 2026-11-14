import { storeCaptures } from "../capture/chromeCaptureStorage";
import { parsePlusvaliaPage } from "../sources/plusvalia/parsePlusvaliaPage";

const CAPTURE_DELAY_MILLISECONDS = 800;

let pendingCapture: ReturnType<typeof setTimeout> | undefined;

async function captureVisibleListings(): Promise<void> {
  const listings = parsePlusvaliaPage(document, new Date());
  if (listings.length > 0) {
    await storeCaptures(listings);
  }
}

function scheduleCapture(): void {
  clearTimeout(pendingCapture);
  pendingCapture = setTimeout(() => {
    captureVisibleListings().catch((error: unknown) => {
      console.error("depazo could not store the visible listings", error);
    });
  }, CAPTURE_DELAY_MILLISECONDS);
}

new MutationObserver(scheduleCapture).observe(document.body, { childList: true, subtree: true });
scheduleCapture();
