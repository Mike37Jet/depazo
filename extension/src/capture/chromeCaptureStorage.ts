import { mergeCaptures } from "./captureCollection";
import { type CapturedListing, capturedListingsSchema } from "./capturedListing";

const STORAGE_KEY = "capturedListings";

export class CorruptedCaptureStorageError extends Error {
  override readonly name = "CorruptedCaptureStorageError";
}

export async function loadCaptures(): Promise<CapturedListing[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = capturedListingsSchema.safeParse(stored[STORAGE_KEY] ?? []);
  if (!parsed.success) {
    throw new CorruptedCaptureStorageError("stored captures do not match the expected schema");
  }
  return parsed.data;
}

export async function storeCaptures(incoming: readonly CapturedListing[]): Promise<number> {
  const merged = mergeCaptures(await loadCaptures(), incoming);
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged.length;
}

export async function clearCaptures(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
