import { useQuery } from "@tanstack/react-query";
import { fetchAvailabilityOverview } from "@/api/rh-availability.api";
import { queryKeys } from "@/lib/query-keys";

export type RhAvailabilityOverviewCtx = {
    token?: string;
    apiBase?: string;
};

export function useRhAvailabilityOverview(ctx: RhAvailabilityOverviewCtx, enabled = true) {
    return useQuery({
        queryKey: [...queryKeys.rh.availabilityOverview(), ctx.token ?? "session"],
        queryFn: ({ signal }) => fetchAvailabilityOverview({ token: ctx.token, apiBase: ctx.apiBase, signal }),
        enabled,
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}
