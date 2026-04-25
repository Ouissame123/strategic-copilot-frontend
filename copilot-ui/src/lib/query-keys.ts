/**
 * Clés TanStack Query centralisées — invalidation ciblée sans chaînes magiques.
 */
export const queryKeys = {
    projectDetail: (id: string) => ["project-detail", id] as const,
    projectRisks: (projectId: string | null) => ["project-risks", projectId ?? "all"] as const,
    portfolio: {
        all: ["portfolio"] as const,
        overview: () => [...queryKeys.portfolio.all, "overview"] as const,
    },
    projects: {
        all: ["projects"] as const,
        lists: () => [...queryKeys.projects.all, "list"] as const,
        list: (page: number, perPage: number) => [...queryKeys.projects.lists(), page, perPage] as const,
        detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
    },
    talent: {
        all: ["talent"] as const,
        workspace: () => [...queryKeys.talent.all, "workspace"] as const,
        notifications: () => [...queryKeys.talent.all, "notifications"] as const,
    },
    rh: {
        all: ["rh"] as const,
        actions: () => [...queryKeys.rh.all, "actions"] as const,
        dashboard: () => [...queryKeys.rh.all, "dashboard"] as const,
        criticalGaps: () => [...queryKeys.rh.all, "critical-gaps"] as const,
        trainingPlans: () => [...queryKeys.rh.all, "training-plans"] as const,
        orgAlerts: () => [...queryKeys.rh.all, "org-alerts"] as const,
    },
    manager: {
        all: ["manager"] as const,
        overview: () => [...queryKeys.manager.all, "overview"] as const,
        projectDetail: (id: string) => [...queryKeys.manager.all, "project-detail", id] as const,
        projectRisks: (projectId: string | null) => [...queryKeys.manager.all, "project-risks", projectId ?? "all"] as const,
    },
} as const;
