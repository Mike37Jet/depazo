import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  decodeSharedSearch,
  readSharedSearchToken,
  type SharedSearch,
  sharedSearchHash,
  sharedSearchTokenHash,
} from "../format/shared-search";
import {
  keepPendingSharedSearch,
  takePendingSharedSearch,
} from "../services/pending-shared-search";
import { useServices } from "../services/services-context";

const SEARCH_PATH = "/busqueda";

export type ReceivedSharedSearch =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "ready"; token: string; search: SharedSearch };

export function useReceivedSharedSearch(): ReceivedSharedSearch {
  const token = useLocation({ select: (location) => readSharedSearchToken(location.hash) });
  if (token === null) {
    return { status: "none" };
  }
  const search = decodeSharedSearch(token);
  return search ? { status: "ready", token, search } : { status: "invalid" };
}

export function useDismissSharedSearch() {
  const navigate = useNavigate();
  return () => navigate({ to: SEARCH_PATH, replace: true });
}

export function useShareSearch() {
  const { share } = useServices();
  return useMutation({
    mutationFn: (search: SharedSearch) =>
      share.share({
        title: "depazo",
        text: "Te comparto mi búsqueda de departamentos en depazo. Ábrela y guárdala para usarla:",
        path: `${SEARCH_PATH}#${sharedSearchHash(search)}`,
      }),
  });
}

export function useKeepSharedSearchThroughSignIn(isSignedIn: boolean | null) {
  const token = useLocation({ select: (location) => readSharedSearchToken(location.hash) });
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn === null) {
      return;
    }
    if (!isSignedIn) {
      if (token !== null) {
        keepPendingSharedSearch(token, globalThis.sessionStorage);
      }
      return;
    }
    const pending = takePendingSharedSearch(globalThis.sessionStorage);
    if (pending !== null && token === null) {
      void navigate({ to: SEARCH_PATH, hash: sharedSearchTokenHash(pending), replace: true });
    }
  }, [isSignedIn, token, navigate]);
}
