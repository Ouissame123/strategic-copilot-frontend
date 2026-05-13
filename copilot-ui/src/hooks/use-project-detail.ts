import { useQuery } from "@tanstack/react-query";
import { managerProjectsApi } from "@/api/manager-projects.api";
import { queryKeys } from "@/lib/query-keys";

export function useProjectDetail(projectId: string, enabled = true) {
    const id = projectId.trim();
    return useQuery({
        queryKey: queryKeys.manager.projectDetail(id),
        queryFn: () => managerProjectsApi.detail(id).then((res) => res.data),
        enabled: enabled && Boolean(id),
        staleTime: 60_000,
    });
}
