import * as z from "zod/mini";
import type { CaptureExport } from "../capture/capturedListing";

export const NATIVE_HOST_NAME = "com.depazo.capture";
export const DELIVERY_TIMEOUT_MILLISECONDS = 4 * 60 * 1000;
export const DELIVERY_ERROR_CODES = ["invalid_capture", "unavailable"] as const;

export type DeliveryErrorCode = (typeof DELIVERY_ERROR_CODES)[number];

const count = z.int().check(z.nonnegative());

const nativeHostReplySchema = z.union([
  z.strictObject({ ok: z.literal(true), new: count, repriced: count, unchanged: count }),
  z.strictObject({ ok: z.literal(false), error: z.enum(DELIVERY_ERROR_CODES) }),
]);

export const deliveryOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("delivered"),
    newCount: count,
    repricedCount: count,
    unchangedCount: count,
  }),
  z.strictObject({ kind: z.literal("rejected"), error: z.enum(DELIVERY_ERROR_CODES) }),
  z.strictObject({ kind: z.literal("disconnected") }),
  z.strictObject({ kind: z.literal("timedOut") }),
  z.strictObject({ kind: z.literal("invalidReply") }),
]);

export type DeliveryOutcome = z.infer<typeof deliveryOutcomeSchema>;

export interface NativeHostPort {
  send(message: CaptureExport): void;
  close(): void;
  onReply(listener: (reply: unknown) => void): void;
  onClosed(listener: () => void): void;
}

export interface NativeHostConnection {
  connect(): NativeHostPort;
  startTimeout(onTimeout: () => void, milliseconds: number): () => void;
}

export function deliveryOutcomeFrom(reply: unknown): DeliveryOutcome {
  const parsed = nativeHostReplySchema.safeParse(reply);
  if (!parsed.success) {
    return { kind: "invalidReply" };
  }
  if (!parsed.data.ok) {
    return { kind: "rejected", error: parsed.data.error };
  }
  return {
    kind: "delivered",
    newCount: parsed.data.new,
    repricedCount: parsed.data.repriced,
    unchangedCount: parsed.data.unchanged,
  };
}

export function exchangeWithNativeHost(
  connection: NativeHostConnection,
  capture: CaptureExport,
): Promise<DeliveryOutcome> {
  return new Promise((resolve) => {
    const port = connection.connect();
    let isSettled = false;
    const cancelTimeout = connection.startTimeout(() => {
      settle({ kind: "timedOut" });
      port.close();
    }, DELIVERY_TIMEOUT_MILLISECONDS);

    function settle(outcome: DeliveryOutcome): void {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cancelTimeout();
      resolve(outcome);
    }

    port.onReply((reply) => {
      settle(deliveryOutcomeFrom(reply));
      port.close();
    });
    port.onClosed(() => settle({ kind: "disconnected" }));
    port.send(capture);
  });
}
