const STORAGE_KEY = "depazo-pending-shared-search";

type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function keepPendingSharedSearch(token: string, storage: PendingStorage | undefined) {
  try {
    storage?.setItem(STORAGE_KEY, token);
  } catch (error) {
    console.warn("shared search could not be kept for after sign-in", error);
  }
}

export function takePendingSharedSearch(storage: PendingStorage | undefined): string | null {
  try {
    const token = storage?.getItem(STORAGE_KEY) ?? null;
    storage?.removeItem(STORAGE_KEY);
    return token;
  } catch (error) {
    console.warn("pending shared search could not be read", error);
    return null;
  }
}
