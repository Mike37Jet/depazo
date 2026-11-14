import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServices } from "../services/services-context";

export function useRequestSignInCode() {
  const { auth } = useServices();
  return useMutation({ mutationFn: (email: string) => auth.sendSignInCode(email) });
}

export function useVerifySignInCode() {
  const { auth } = useServices();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      auth.verifySignInCode(email, code),
  });
}

export function useSignInWithGoogle() {
  const { auth } = useServices();
  return useMutation({ mutationFn: () => auth.signInWithGoogle() });
}

export function useRedirectSignInFailure() {
  const { auth } = useServices();
  const [hasFailed, setHasFailed] = useState(() => auth.hasRedirectSignInFailed());
  const dismiss = () => {
    auth.dismissRedirectSignInFailure();
    setHasFailed(false);
  };
  return { hasFailed, dismiss };
}

export function useSignOut() {
  const { auth } = useServices();
  return useMutation({ mutationFn: () => auth.signOut() });
}
