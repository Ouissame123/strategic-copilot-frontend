/**
 * Clés TanStack Query centralisées — invalidation ciblée sans chaînes magiques.
 */
export const queryKeys = {
    projectDetail: (id: string) => ["project-detail", id] as const,
    projectRisks: (projectId: string | null) => ["project-risks", projectId ?? "all"] as const,
    projectTasks: (projectId: string) => ["project-tasks", projectId] as const,
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
        analytics: (enterpriseId: string) => [...queryKeys.rh.all, "analytics", enterpriseId] as const,
        notifications: (enterpriseId: string, limit: number) =>
            [...queryKeys.rh.all, "notifications", enterpriseId, limit] as const,
        talents: (enterpriseId: string) => [...queryKeys.rh.all, "talents", enterpriseId] as const,
        talentDetail: (talentId: string) => [...queryKeys.rh.all, "talent-detail", talentId] as const,
        talentSkills: (talentId: string) => ["talent-skills", talentId] as const,
        talentEmployment: (talentId: string) => [...queryKeys.rh.all, "talent-employment", talentId] as const,
        talentAbsences: (talentId: string) => ["talent-absences", talentId] as const,
        matchingProjects: () => [...queryKeys.rh.all, "matching-projects"] as const,
        matchingResults: (projectId: string) => [...queryKeys.rh.all, "matching-results", projectId] as const,
        skillsCatalog: () => ["skills-catalog"] as const,
        availabilityOverview: () => [...queryKeys.rh.all, "availability-overview"] as const,
        talentAvailability: (talentId: string) =>
            [...queryKeys.rh.all, "talent-availability", talentId] as const,
    },
    manager: {
        all: ["manager"] as const,
        overview: () => [...queryKeys.manager.all, "overview"] as const,
        analystIpi: (ctx: { enterpriseId: string; managerId: string } | string) =>
            ["analyst-ipi", ctx] as const,
        analystNineBox: (ctx: { enterpriseId: string; managerId: string } | string) =>
            ["analyst-nine-box", ctx] as const,
        analystMobility: (ctx: { enterpriseId: string; managerId: string } | string) =>
            ["analyst-mobility", ctx] as const,
        projectDetail: (id: string) => [...queryKeys.manager.all, "project-detail", id] as const,
        projectRisks: (projectId: string | null) => [...queryKeys.manager.all, "project-risks", projectId ?? "all"] as const,
    },
} as const;
