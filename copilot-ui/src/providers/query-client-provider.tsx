import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/** Client partagé — invalidation depuis hooks / mutations hors React. */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: (failureCount, error) => {
                if (failureCount >= 2) return false;
                const name = error instanceof Error ? error.name : "";
                if (name === "AbortError") return false;
                return true;
            },
            refetchOnWindowFocus: true,
        },
        mutations: {
            retry: 0,
        },
    },
});

export function QueryClientProviderWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
