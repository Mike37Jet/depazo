import type { CapturedListing } from "../capture/capturedListing";
import { storeCaptures } from "../capture/chromeCaptureStorage";

const CAPTURE_DELAY_MILLISECONDS = 800;

type PageParser = (root: ParentNode, capturedAt: Date) => CapturedListing[];
type PageFilter = (url: URL) => boolean;

export function captureWhileBrowsing(parsePage: PageParser, isCapturablePage: PageFilter): void {
  let pendingCapture: ReturnType<typeof setTimeout> | undefined;

  async function captureVisibleListings(): Promise<void> {
    if (!isCapturablePage(new URL(location.href))) {
      return;
    }
    const listings = parsePage(document, new Date());
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
}
