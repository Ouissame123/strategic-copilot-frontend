import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents.api";

/** Vue risques manager / enterprise : POST sans `project_id` si le workflow le supporte. */
export const useRisks = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: ["risks", "enterprise"],
        queryFn: () => agentsApi.riskKpi({ use_ai: true }).then((r) => r.data),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: false,
        enabled: options?.enabled ?? true,
    });
