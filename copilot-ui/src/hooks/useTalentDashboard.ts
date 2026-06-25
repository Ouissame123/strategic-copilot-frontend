import { useQuery } from "@tanstack/react-query";
import { talentDashboardApi } from "@/api/talent-dashboard.api";
import { queryKeys } from "@/lib/query-keys";

export function useTalentDashboard() {
    return useQuery({
        queryKey: queryKeys.talent.dashboard(),
        queryFn: ({ signal }) => talentDashboardApi.get({ signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
