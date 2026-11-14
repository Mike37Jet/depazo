import { describe, expect, it } from "vitest";
import { buildCaptureExport } from "../../src/capture/captureCollection";
import {
  addPending,
  deliveryKey,
  MAX_DELIVERED_KEYS,
  MAX_DELIVERY_BYTES,
  MAX_LISTINGS_PER_DELIVERY,
  MAX_PENDING_LISTINGS,
  nextDeliveryBatch,
  rememberDelivered,
  selectUndelivered,
  withoutDelivered,
} from "../../src/watch/deliveredCaptures";
import { aCapturedListing, listingsNumbered } from "./watchFakes";

const HOST_MESSAGE_BYTES = 256 * 1024;

describe("deliveryKey", () => {
  it("joins the identifier, the rent and the condo fee", () => {
    const listing = aCapturedListing({ externalId: "42", monthlyRentUsd: 900, condoFeeUsd: 80 });

    expect(deliveryKey(listing)).toBe("42:900:80");
  });

  it("ignores when the listing was captured", () => {
    const earlier = aCapturedListing({ capturedAt: "2026-11-14T10:00:00.000Z" });
    const later = aCapturedListing({ capturedAt: "2026-11-14T10:20:00.000Z" });

    expect(deliveryKey(later)).toBe(deliveryKey(earlier));
  });

  it.each([[{ monthlyRentUsd: 850 }], [{ condoFeeUsd: 60 }]])(
    "changes when the price changes to %o",
    (change) => {
      expect(deliveryKey(aCapturedListing(change))).not.toBe(deliveryKey(aCapturedListing()));
    },
  );
});

describe("selectUndelivered", () => {
  it("keeps only the listings whose key was never delivered", () => {
    const delivered = aCapturedListing({ externalId: "1" });
    const fresh = aCapturedListing({ externalId: "2" });

    const undelivered = selectUndelivered([delivered, fresh], [deliveryKey(delivered)]);

    expect(undelivered).toEqual([fresh]);
  });

  it("selects a delivered listing again after its price changes", () => {
    const delivered = aCapturedListing({ monthlyRentUsd: 900 });
    const repriced = aCapturedListing({ monthlyRentUsd: 850 });

    expect(selectUndelivered([repriced], [deliveryKey(delivered)])).toEqual([repriced]);
  });
});

describe("nextDeliveryBatch", () => {
  it("never holds more listings than one delivery allows", () => {
    const batch = nextDeliveryBatch(listingsNumbered(MAX_LISTINGS_PER_DELIVERY + 50), []);

    expect(batch).toHaveLength(MAX_LISTINGS_PER_DELIVERY);
    expect(batch[0]?.externalId).toBe("1");
  });

  it("stays under the message size the host accepts when the listings are long", () => {
    const longUrl = `https://www.plusvalia.com/${"a".repeat(2000)}`;
    const pending = listingsNumbered(MAX_LISTINGS_PER_DELIVERY).map((listing) => ({
      ...listing,
      url: longUrl,
      imageUrl: longUrl,
      title: "ñ".repeat(300),
    }));

    const batch = nextDeliveryBatch(pending, []);

    const envelope = JSON.stringify(buildCaptureExport(batch, new Date(0)));
    expect(new TextEncoder().encode(envelope).length).toBeLessThanOrEqual(HOST_MESSAGE_BYTES);
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThan(MAX_LISTINGS_PER_DELIVERY);
    expect(batch[0]?.externalId).toBe("1");
  });

  it("still sends a listing that alone exceeds the size budget", () => {
    const oversized = aCapturedListing({ title: "a".repeat(MAX_DELIVERY_BYTES) });

    expect(nextDeliveryBatch([oversized, aCapturedListing({ externalId: "2" })], [])).toEqual([
      oversized,
    ]);
  });
});

describe("addPending", () => {
  it("keeps one pending entry per listing with the latest price", () => {
    const pending = addPending(
      [aCapturedListing({ monthlyRentUsd: 900 })],
      [aCapturedListing({ monthlyRentUsd: 850 })],
      [],
    );

    expect(pending.map((listing) => listing.monthlyRentUsd)).toEqual([850]);
  });

  it("does not queue listings that were already delivered", () => {
    const delivered = aCapturedListing();

    expect(addPending([], [delivered], [deliveryKey(delivered)])).toEqual([]);
  });

  it("does not queue amounts the backend would reject", () => {
    const absurd = aCapturedListing({ monthlyRentUsd: 1_000_001 });

    expect(addPending([], [absurd], [])).toEqual([]);
  });

  it("drops the oldest pending listings beyond the limit", () => {
    const pending = addPending(
      listingsNumbered(MAX_PENDING_LISTINGS),
      [aCapturedListing({ externalId: "newest" })],
      [],
    );

    expect(pending).toHaveLength(MAX_PENDING_LISTINGS);
    expect(pending[0]?.externalId).toBe("2");
    expect(pending.at(-1)?.externalId).toBe("newest");
  });
});

describe("withoutDelivered", () => {
  it("keeps a listing whose price changed while it was being delivered", () => {
    const sent = aCapturedListing({ monthlyRentUsd: 900 });
    const repriced = aCapturedListing({ monthlyRentUsd: 850 });

    expect(withoutDelivered([repriced], [sent])).toEqual([repriced]);
  });
});

describe("rememberDelivered", () => {
  it("adds the keys of the delivered listings", () => {
    const keys = rememberDelivered(["1:900:null"], [aCapturedListing({ externalId: "2" })]);

    expect(keys).toEqual(["1:900:null", "2:900:null"]);
  });

  it("drops the oldest keys beyond the limit", () => {
    const stored = listingsNumbered(MAX_DELIVERED_KEYS).map(deliveryKey);

    const keys = rememberDelivered(stored, [aCapturedListing({ externalId: "newest" })]);

    expect(keys).toHaveLength(MAX_DELIVERED_KEYS);
    expect(keys[0]).toBe("2:900:null");
    expect(keys.at(-1)).toBe("newest:900:null");
  });
});
