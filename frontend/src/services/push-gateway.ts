export type PushAvailability =
  | "available"
  | "needs-install"
  | "unsupported"
  | "blocked"
  | "not-configured";

export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class PushPermissionDeniedError extends Error {
  override name = "PushPermissionDeniedError";
}

export interface PushGateway {
  availability(): PushAvailability;
  currentDevice(): Promise<PushDevice | null>;
  subscribe(): Promise<PushDevice>;
  unsubscribe(): Promise<string | null>;
}
