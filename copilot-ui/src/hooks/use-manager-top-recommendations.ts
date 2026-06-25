import { useQuery } from "@tanstack/react-query";
import { managerTopRecommendationsApi } from "@/api/manager-top-recommendations.api";

export function useManagerTopRecommendations(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["manager", "top-recommendations"],
        queryFn: () => managerTopRecommendationsApi.list().then((response) => response.data),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        enabled: options?.enabled ?? true,
    });
}
