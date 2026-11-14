import {
  CAPTURE_FORMAT,
  CAPTURE_FORMAT_VERSION,
  type CapturedListing,
  type CaptureExport,
  MAX_STORED_LISTINGS,
} from "./capturedListing";

function captureKey(listing: CapturedListing): string {
  return `${listing.source}:${listing.externalId}`;
}

export function mergeCaptures(
  stored: readonly CapturedListing[],
  incoming: readonly CapturedListing[],
): CapturedListing[] {
  const byKey = new Map(stored.map((listing) => [captureKey(listing), listing]));
  for (const listing of incoming) {
    byKey.delete(captureKey(listing));
    byKey.set(captureKey(listing), listing);
  }
  return [...byKey.values()].slice(-MAX_STORED_LISTINGS);
}

export function buildCaptureExport(
  listings: readonly CapturedListing[],
  exportedAt: Date,
): CaptureExport {
  return {
    format: CAPTURE_FORMAT,
    version: CAPTURE_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    listings: [...listings],
  };
}

export function exportFileName(exportedAt: Date): string {
  return `depazo-captura-${exportedAt.toISOString().slice(0, 10)}.json`;
}
