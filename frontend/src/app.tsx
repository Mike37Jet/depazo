import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { createAppRouter } from "./routes/router";
import { type AppServices, ServicesProvider } from "./services/services-context";

export interface AppProps {
  services: AppServices;
  queryClient: QueryClient;
  router: ReturnType<typeof createAppRouter>;
}

export function App({ services, queryClient, router }: AppProps) {
  return (
    <ServicesProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ServicesProvider>
  );
}
