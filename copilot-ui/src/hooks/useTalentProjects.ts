import { useQuery } from "@tanstack/react-query";
import { talentProjectsApi } from "@/api/talent-projects.api";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectTab } from "@/types/talent-projects";

export function useTalentProjects(tab: ProjectTab = "active") {
    return useQuery({
        queryKey: queryKeys.talent.projectsList(tab),
        queryFn: ({ signal }) => talentProjectsApi.list(tab, 50, { signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentProjectsSummary() {
    return useQuery({
        queryKey: queryKeys.talent.projectsSummary(),
        queryFn: ({ signal }) => talentProjectsApi.summary({ signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentProjectDetail(id: string | null) {
    return useQuery({
        queryKey: queryKeys.talent.projectDetail(id ?? ""),
        queryFn: ({ signal }) => talentProjectsApi.detail(id!, { signal }),
        enabled: Boolean(id),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
