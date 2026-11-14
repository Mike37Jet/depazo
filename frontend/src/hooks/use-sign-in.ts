import { useMutation } from "@tanstack/react-query";
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

export function useSignOut() {
  const { auth } = useServices();
  return useMutation({ mutationFn: () => auth.signOut() });
}
