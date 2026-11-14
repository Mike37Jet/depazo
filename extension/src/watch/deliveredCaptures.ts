import type { CapturedListing } from "../capture/capturedListing";

export const MAX_DELIVERED_KEYS = 2000;
export const MAX_PENDING_LISTINGS = 500;
export const MAX_LISTINGS_PER_DELIVERY = 100;
export const MAX_DELIVERY_BYTES = 200 * 1024;
export const MINIMUM_DELIVERY_SPACING_MILLISECONDS = 60 * 1000;
export const MAX_DELIVERABLE_AMOUNT_USD = 1_000_000;

export function deliveryKey(listing: CapturedListing): string {
  return `${listing.externalId}:${listing.monthlyRentUsd}:${listing.condoFeeUsd}`;
}

export function isDeliverable(listing: CapturedListing): boolean {
  return (
    (listing.monthlyRentUsd ?? 0) <= MAX_DELIVERABLE_AMOUNT_USD &&
    (listing.condoFeeUsd ?? 0) <= MAX_DELIVERABLE_AMOUNT_USD
  );
}

function serializedBytes(listing: CapturedListing): number {
  return new TextEncoder().encode(JSON.stringify(listing)).length + 1;
}

export function selectUndelivered(
  listings: readonly CapturedListing[],
  deliveredKeys: readonly string[],
): CapturedListing[] {
  const delivered = new Set(deliveredKeys);
  return listings.filter((listing) => !delivered.has(deliveryKey(listing)));
}

export function nextDeliveryBatch(
  pending: readonly CapturedListing[],
  deliveredKeys: readonly string[],
): CapturedListing[] {
  const batch: CapturedListing[] = [];
  let batchBytes = 0;
  for (const listing of selectUndelivered(pending, deliveredKeys)) {
    batchBytes += serializedBytes(listing);
    const isFull = batch.length >= MAX_LISTINGS_PER_DELIVERY || batchBytes > MAX_DELIVERY_BYTES;
    if (isFull && batch.length > 0) {
      break;
    }
    batch.push(listing);
  }
  return batch;
}

export function addPending(
  pending: readonly CapturedListing[],
  reported: readonly CapturedListing[],
  deliveredKeys: readonly string[],
): CapturedListing[] {
  const byExternalId = new Map(pending.map((listing) => [listing.externalId, listing]));
  for (const listing of selectUndelivered(reported.filter(isDeliverable), deliveredKeys)) {
    byExternalId.delete(listing.externalId);
    byExternalId.set(listing.externalId, listing);
  }
  return [...byExternalId.values()].slice(-MAX_PENDING_LISTINGS);
}

export function withoutDelivered(
  pending: readonly CapturedListing[],
  delivered: readonly CapturedListing[],
): CapturedListing[] {
  const deliveredKeys = new Set(delivered.map(deliveryKey));
  return pending.filter((listing) => !deliveredKeys.has(deliveryKey(listing)));
}

export function rememberDelivered(
  deliveredKeys: readonly string[],
  delivered: readonly CapturedListing[],
): string[] {
  const keys = new Set(deliveredKeys);
  for (const listing of delivered) {
    keys.delete(deliveryKey(listing));
    keys.add(deliveryKey(listing));
  }
  return [...keys].slice(-MAX_DELIVERED_KEYS);
}
