import * as z from "zod/mini";
import { deliveryOutcomeSchema } from "./nativeDelivery";

export const ATTENTION_REASONS = ["noReport"] as const;

export const watchStateSchema = z.strictObject({
  isEnabled: z.boolean(),
  attentionReason: z.nullable(z.enum(ATTENTION_REASONS)),
  tabId: z.nullable(z.int()),
  awaitingReportSince: z.nullable(z.iso.datetime()),
  lastReloadAt: z.nullable(z.iso.datetime()),
  lastReportDocumentId: z.nullable(z.string()),
  nextCatchUpPage: z._default(z.int().check(z.minimum(2)), 2),
  isAwaitingCatchUpPage: z._default(z.boolean(), false),
  lastCheckAt: z.nullable(z.iso.datetime()),
  lastDeliveryAttemptAt: z.nullable(z.iso.datetime()),
  lastDelivery: z.nullable(
    z.strictObject({ at: z.iso.datetime(), outcome: deliveryOutcomeSchema }),
  ),
});

export type WatchState = z.infer<typeof watchStateSchema>;

export const DEFAULT_WATCH_STATE: WatchState = {
  isEnabled: false,
  attentionReason: null,
  tabId: null,
  awaitingReportSince: null,
  lastReloadAt: null,
  lastReportDocumentId: null,
  nextCatchUpPage: 2,
  isAwaitingCatchUpPage: false,
  lastCheckAt: null,
  lastDeliveryAttemptAt: null,
  lastDelivery: null,
};

export function needsAttention(state: WatchState): boolean {
  return state.attentionReason !== null;
}
