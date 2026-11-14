import {
  type PushAvailability,
  type PushDevice,
  type PushGateway,
  PushPermissionDeniedError,
} from "./push-gateway";

const APPLE_MOBILE_DEVICE = /iPhone|iPad|iPod/;

export class BrowserPushGateway implements PushGateway {
  constructor(private readonly vapidPublicKey: string | null) {}

  availability(): PushAvailability {
    if (!this.vapidPublicKey) {
      return "not-configured";
    }
    if (!isPushSupported()) {
      return isAppleMobileBrowserTab() ? "needs-install" : "unsupported";
    }
    return Notification.permission === "denied" ? "blocked" : "available";
  }

  async currentDevice(): Promise<PushDevice | null> {
    if (!isPushSupported()) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription && Notification.permission === "granted"
      ? toPushDevice(subscription)
      : null;
  }

  async subscribe(): Promise<PushDevice> {
    if (!this.vapidPublicKey || !isPushSupported()) {
      throw new PushPermissionDeniedError("push is not available on this device");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new PushPermissionDeniedError("the user did not allow notifications");
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(this.vapidPublicKey),
    });
    return toPushDevice(subscription);
  }

  async unsubscribe(): Promise<string | null> {
    if (!isPushSupported()) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }
    await subscription.unsubscribe();
    return subscription.endpoint;
  }
}

function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator && "PushManager" in globalThis && "Notification" in globalThis
  );
}

function isAppleMobileBrowserTab(): boolean {
  return (
    APPLE_MOBILE_DEVICE.test(navigator.userAgent) &&
    !globalThis.matchMedia("(display-mode: standalone)").matches
  );
}

function toPushDevice(subscription: PushSubscription): PushDevice {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!p256dh || !auth) {
    throw new PushPermissionDeniedError("the browser returned a subscription without keys");
  }
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: encodeBase64Url(p256dh), auth: encodeBase64Url(auth) },
  };
}

function encodeBase64Url(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
