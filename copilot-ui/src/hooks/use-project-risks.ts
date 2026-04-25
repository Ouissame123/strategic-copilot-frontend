import { useQuery } from "@tanstack/react-query";
import { getProjectRisks } from "@/api/project-risks.api";
import { queryKeys } from "@/lib/query-keys";

export function useProjectRisks(projectId: string | null) {
    const id = projectId?.trim() || null;
    return useQuery({
        queryKey: queryKeys.manager.projectRisks(id),
        queryFn: ({ signal }) => getProjectRisks(id ?? undefined, { signal }),
        staleTime: 30_000,
    });
}
