import {
  type PushAvailability,
  type PushDevice,
  type PushGateway,
  PushPermissionDeniedError,
} from "../services/push-gateway";

export const TEST_DEVICE: PushDevice = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
  keys: { p256dh: `B${"x".repeat(86)}`, auth: "a".repeat(22) },
};

export class FakePushGateway implements PushGateway {
  private device: PushDevice | null = null;

  constructor(
    private readonly currentAvailability: PushAvailability = "available",
    private readonly isPermissionGranted = true,
  ) {}

  availability(): PushAvailability {
    return this.currentAvailability;
  }

  async currentDevice(): Promise<PushDevice | null> {
    return this.device;
  }

  async subscribe(): Promise<PushDevice> {
    if (!this.isPermissionGranted) {
      throw new PushPermissionDeniedError("denied in test");
    }
    this.device = TEST_DEVICE;
    return TEST_DEVICE;
  }

  async unsubscribe(): Promise<string | null> {
    const endpoint = this.device?.endpoint ?? null;
    this.device = null;
    return endpoint;
  }
}
