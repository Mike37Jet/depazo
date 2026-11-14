import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServices } from "../services/services-context";

const PUSH_DEVICE_KEY = ["push-device"] as const;

export function usePushNotifications() {
  const { api, push } = useServices();
  const queryClient = useQueryClient();
  const device = useQuery({ queryKey: PUSH_DEVICE_KEY, queryFn: () => push.currentDevice() });

  const enable = useMutation({
    mutationFn: async () => {
      const subscribed = await push.subscribe();
      await api.subscribeToPush(subscribed);
      return subscribed;
    },
    onSuccess: (subscribed) => queryClient.setQueryData(PUSH_DEVICE_KEY, subscribed),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await push.unsubscribe();
      if (endpoint) {
        await api.unsubscribeFromPush(endpoint);
      }
    },
    onSuccess: () => queryClient.setQueryData(PUSH_DEVICE_KEY, null),
  });

  return {
    availability: push.availability(),
    isEnabled: Boolean(device.data),
    isBusy: device.isPending || enable.isPending || disable.isPending,
    enable,
    disable,
  };
}
