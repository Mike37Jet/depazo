import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "../services/auth-gateway";
import { useServices } from "../services/services-context";

export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

export function useSession(): SessionState {
  const { auth } = useServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;
    const apply = (session: Session | null) => {
      if (!isActive) {
        return;
      }
      if (!session) {
        queryClient.clear();
      }
      setState(session ? { status: "signed-in", session } : { status: "signed-out" });
    };
    auth.currentSession().then(apply, () => apply(null));
    const unsubscribe = auth.onSessionChange(apply);
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [auth, queryClient]);

  return state;
}
