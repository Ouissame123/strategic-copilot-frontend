import { useQuery } from "@tanstack/react-query";
import { getManagerProjectDetail } from "@/api/workspace-manager.api";
import { queryKeys } from "@/lib/query-keys";

export function useProjectDetail(projectId: string, enabled = true) {
    const id = projectId.trim();
    return useQuery({
        queryKey: queryKeys.manager.projectDetail(id),
        queryFn: ({ signal }) => getManagerProjectDetail(id, undefined, { signal }),
        enabled: enabled && Boolean(id),
        staleTime: 30_000,
    });
}
