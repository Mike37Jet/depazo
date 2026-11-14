import type { CapturedListing } from "../capture/capturedListing";
import { storeCaptures } from "../capture/chromeCaptureStorage";

const CAPTURE_DELAY_MILLISECONDS = 800;

type PageParser = (root: ParentNode, capturedAt: Date) => CapturedListing[];
type PageFilter = (url: URL) => boolean;
type PageReporter = (root: ParentNode, capturedAt: Date) => Promise<void>;

export function captureWhileBrowsing(
  parsePage: PageParser,
  isCapturablePage: PageFilter,
  reportPage?: PageReporter,
): void {
  let pendingCapture: ReturnType<typeof setTimeout> | undefined;

  async function captureVisibleListings(): Promise<void> {
    if (!isCapturablePage(new URL(location.href))) {
      return;
    }
    const capturedAt = new Date();
    const listings = parsePage(document, capturedAt);
    await Promise.all([
      listings.length > 0 ? storeCaptures(listings) : undefined,
      reportPage?.(document, capturedAt),
    ]);
  }

  function scheduleCapture(): void {
    clearTimeout(pendingCapture);
    pendingCapture = setTimeout(() => {
      captureVisibleListings().catch((error: unknown) => {
        console.error("depazo could not store or report the visible listings", error);
      });
    }, CAPTURE_DELAY_MILLISECONDS);
  }

  new MutationObserver(scheduleCapture).observe(document.body, { childList: true, subtree: true });
  scheduleCapture();
}
