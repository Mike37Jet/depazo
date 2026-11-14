import { describe, expect, it } from "vitest";
import { buildCaptureExport } from "../../src/capture/captureCollection";
import {
  DELIVERY_TIMEOUT_MILLISECONDS,
  deliveryOutcomeFrom,
  exchangeWithNativeHost,
  type NativeHostConnection,
} from "../../src/watch/nativeDelivery";
import { aCapturedListing, MIDMORNING } from "./watchFakes";

const CAPTURE = buildCaptureExport([aCapturedListing()], MIDMORNING);

class FakeNativeHost {
  sentMessages: unknown[] = [];
  closeCount = 0;
  timeoutMilliseconds: number | null = null;
  isTimeoutCancelled = false;
  reply: (reply: unknown) => void = () => undefined;
  disconnect: () => void = () => undefined;
  expireTimeout: () => void = () => undefined;

  get connection(): NativeHostConnection {
    return {
      connect: () => ({
        send: (message) => {
          this.sentMessages.push(message);
        },
        close: () => {
          this.closeCount += 1;
        },
        onReply: (listener) => {
          this.reply = listener;
        },
        onClosed: (listener) => {
          this.disconnect = listener;
        },
      }),
      startTimeout: (onTimeout, milliseconds) => {
        this.expireTimeout = onTimeout;
        this.timeoutMilliseconds = milliseconds;
        return () => {
          this.isTimeoutCancelled = true;
        };
      },
    };
  }
}

describe("deliveryOutcomeFrom", () => {
  it("reads the counts of a successful reply", () => {
    const outcome = deliveryOutcomeFrom({ ok: true, new: 2, repriced: 1, unchanged: 27 });

    expect(outcome).toEqual({
      kind: "delivered",
      newCount: 2,
      repricedCount: 1,
      unchangedCount: 27,
    });
  });

  it.each(["invalid_capture", "unavailable"])("reads the %s failure code", (error) => {
    expect(deliveryOutcomeFrom({ ok: false, error })).toEqual({ kind: "rejected", error });
  });

  it.each([
    [{ ok: true }],
    [{ ok: true, new: -1, repriced: 0, unchanged: 0 }],
    [{ ok: true, new: 1, repriced: 0, unchanged: 0, extra: "field" }],
    [{ ok: false, error: "Traceback (most recent call last)" }],
    [{ ok: "true", new: 1, repriced: 0, unchanged: 0 }],
    ["ok"],
    [null],
  ])("does not trust the unexpected reply %o", (reply) => {
    expect(deliveryOutcomeFrom(reply)).toEqual({ kind: "invalidReply" });
  });
});

describe("exchangeWithNativeHost", () => {
  it("sends one message and resolves with the single reply, then disconnects", async () => {
    const host = new FakeNativeHost();

    const exchange = exchangeWithNativeHost(host.connection, CAPTURE);
    host.reply({ ok: true, new: 1, repriced: 0, unchanged: 0 });

    await expect(exchange).resolves.toMatchObject({ kind: "delivered", newCount: 1 });
    expect(host.sentMessages).toEqual([CAPTURE]);
    expect(host.closeCount).toBe(1);
    expect(host.isTimeoutCancelled).toBe(true);
  });

  it("reports a disconnect without reply as not delivered", async () => {
    const host = new FakeNativeHost();

    const exchange = exchangeWithNativeHost(host.connection, CAPTURE);
    host.disconnect();

    await expect(exchange).resolves.toEqual({ kind: "disconnected" });
    expect(host.isTimeoutCancelled).toBe(true);
  });

  it("gives up after four minutes and disconnects", async () => {
    const host = new FakeNativeHost();

    const exchange = exchangeWithNativeHost(host.connection, CAPTURE);
    host.expireTimeout();

    await expect(exchange).resolves.toEqual({ kind: "timedOut" });
    expect(host.timeoutMilliseconds).toBe(4 * 60 * 1000);
    expect(host.timeoutMilliseconds).toBe(DELIVERY_TIMEOUT_MILLISECONDS);
    expect(host.closeCount).toBe(1);
  });

  it("keeps the first outcome when the host replies after the timeout", async () => {
    const host = new FakeNativeHost();

    const exchange = exchangeWithNativeHost(host.connection, CAPTURE);
    host.expireTimeout();
    host.reply({ ok: true, new: 1, repriced: 0, unchanged: 0 });

    await expect(exchange).resolves.toEqual({ kind: "timedOut" });
  });

  it("keeps the reply when the host disconnects right after answering", async () => {
    const host = new FakeNativeHost();

    const exchange = exchangeWithNativeHost(host.connection, CAPTURE);
    host.reply({ ok: false, error: "unavailable" });
    host.disconnect();

    await expect(exchange).resolves.toEqual({ kind: "rejected", error: "unavailable" });
  });
});
