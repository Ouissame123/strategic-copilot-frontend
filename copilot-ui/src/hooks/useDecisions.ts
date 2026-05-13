import { useQuery } from "@tanstack/react-query";
import { decisionsApi } from "@/services/decisions.api";

/** Liste des décisions Copilot (GET `/webhook/manager/copilot-decisions`). */
export function useDecisions(params?: { project_id?: string; scope?: string; limit?: number; enabled?: boolean }) {
    const enabled = params?.enabled ?? true;
    const { enabled: _omit, ...rest } = params ?? {};
    return useQuery({
        queryKey: ["decisions", rest],
        queryFn: () => decisionsApi.list(rest).then((r) => r.data),
        enabled,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}
