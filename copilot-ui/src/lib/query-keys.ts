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
        notificationsSummary: () => [...queryKeys.talent.notifications(), "summary"] as const,
        notificationsList: (unreadOnly: boolean) => [...queryKeys.talent.notifications(), "list", unreadOnly] as const,
        requests: () => [...queryKeys.talent.all, "requests"] as const,
        requestsList: (filters?: Record<string, unknown>) =>
            [...queryKeys.talent.requests(), "list", filters ?? {}] as const,
        requestsSummary: () => [...queryKeys.talent.requests(), "summary"] as const,
        requestDetail: (id: string) => [...queryKeys.talent.requests(), "detail", id] as const,
        dashboard: () => [...queryKeys.talent.all, "dashboard"] as const,
        projects: () => [...queryKeys.talent.all, "projects"] as const,
        projectsList: (tab: string) => [...queryKeys.talent.projects(), "list", tab] as const,
        projectsSummary: () => [...queryKeys.talent.projects(), "summary"] as const,
        projectDetail: (id: string) => [...queryKeys.talent.projects(), "detail", id] as const,
        skills: () => [...queryKeys.talent.all, "skills"] as const,
        skillsList: (filters?: Record<string, unknown>) =>
            [...queryKeys.talent.skills(), "list", filters ?? {}] as const,
        skillsSummary: () => [...queryKeys.talent.skills(), "summary"] as const,
        skillsCatalog: (search: string) => [...queryKeys.talent.skills(), "catalog", search] as const,
        skillsGaps: () => [...queryKeys.talent.skills(), "gaps"] as const,
        opportunities: () => [...queryKeys.talent.all, "opportunities"] as const,
        opportunitiesList: (filters?: Record<string, unknown>) =>
            [...queryKeys.talent.opportunities(), "list", filters ?? {}] as const,
        opportunitiesSummary: () => [...queryKeys.talent.opportunities(), "summary"] as const,
        opportunityDetail: (projectId: string) => [...queryKeys.talent.opportunities(), "detail", projectId] as const,
        chat: () => [...queryKeys.talent.all, "chat"] as const,
        chatSessions: () => [...queryKeys.talent.chat(), "sessions"] as const,
        chatSession: (id: string) => [...queryKeys.talent.chat(), "session", id] as const,
        profile: () => [...queryKeys.talent.all, "profile"] as const,
    },
    rh: {
        all: ["rh"] as const,
        actions: () => [...queryKeys.rh.all, "actions"] as const,
        /** WF_RH_Requests_Decision — GET/PATCH `/webhook/rh/requests`. */
        requests: () => [...queryKeys.rh.all, "requests"] as const,
        requestsSummary: () => [...queryKeys.rh.requests(), "summary"] as const,
        /** WF_RH_Risks_Watchdog_v1 — GET `/webhook/rh/risks`. */
        risks: () => [...queryKeys.rh.all, "risks"] as const,
        risksList: (params?: Record<string, unknown>) => [...queryKeys.rh.risks(), "list", params ?? {}] as const,
        risksSummary: () => [...queryKeys.rh.risks(), "summary"] as const,
        risksTalent: (talentId: string) => [...queryKeys.rh.risks(), "talent", talentId] as const,
        /** WF_RH_Accounts_CRUD_v1 */
        accounts: () => [...queryKeys.rh.all, "accounts"] as const,
        accountsUsers: (params?: Record<string, unknown>) => [...queryKeys.rh.accounts(), "users", params ?? {}] as const,
        accountsTalents: (params?: Record<string, unknown>) => [...queryKeys.rh.accounts(), "talents", params ?? {}] as const,
        accountsUnlinkedTalents: (search?: string) =>
            [...queryKeys.rh.accounts(), "unlinked-talents", { search: search ?? "" }] as const,
        accountsManagers: () => [...queryKeys.rh.accounts(), "managers"] as const,
        /** WF_RH_Accounts_Audit_View */
        accountsAuditRoot: () => [...queryKeys.rh.accounts(), "audit-view"] as const,
        accountsStats: () => [...queryKeys.rh.accountsAuditRoot(), "stats"] as const,
        accountsOrphaned: (limit?: number) => [...queryKeys.rh.accountsAuditRoot(), "orphaned", limit ?? 100] as const,
        accountsAudit: (params?: Record<string, unknown>) =>
            [...queryKeys.rh.accountsAuditRoot(), "audit", params ?? {}] as const,
        /** WF_RH_Talents_Profile_CRUD */
        talentsProfileRoot: () => [...queryKeys.rh.all, "talents-profile"] as const,
        talentsProfile: (params?: Record<string, unknown>) =>
            [...queryKeys.rh.talentsProfileRoot(), params ?? {}] as const,
        /** WF_RH_Talent_Portal_Access — talents sans compte */
        portalAccessUnlinkedRoot: () => [...queryKeys.rh.all, "rh-talents-unlinked"] as const,
        portalAccessUnlinked: (params?: Record<string, unknown>) =>
            [...queryKeys.rh.portalAccessUnlinkedRoot(), params ?? {}] as const,
        /** WF_RH_Users_Management */
        usersRoot: () => [...queryKeys.rh.all, "rh-users"] as const,
        users: (params?: Record<string, unknown>) => [...queryKeys.rh.usersRoot(), params ?? {}] as const,
        /** WF_RH_Conversations + WF_RH_Chat */
        chat: {
            conversationsRoot: ["rh", "chat", "conversations"] as const,
            conversations: (params: {
                status?: string;
                search?: string;
                limit?: number;
            }) => ["rh", "chat", "conversations", params.status ?? "all", params.search ?? "", params.limit ?? 50] as const,
            detail: (id: string) => ["rh", "chat", "detail", id] as const,
        },
        dashboard: () => [...queryKeys.rh.all, "dashboard"] as const,
        analytics: (enterpriseId: string) => [...queryKeys.rh.all, "analytics", enterpriseId] as const,
        notifications: (enterpriseId: string, limit: number) =>
            [...queryKeys.rh.all, "notifications", enterpriseId, limit] as const,
        notificationsInbox: (filters: Record<string, unknown>) =>
            [...queryKeys.rh.all, "notifications", "inbox", filters] as const,
        notificationsBell: (limit: number) => [...queryKeys.rh.all, "notifications", "bell", limit] as const,
        notificationsBellPoll: () => [...queryKeys.rh.all, "notifications", "bell-poll"] as const,
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
        projectDetail: (id: string) => queryKeys.projectDetail(id),
        projectRisks: (projectId: string | null) => [...queryKeys.manager.all, "project-risks", projectId ?? "all"] as const,
        validations: (scope: string, params?: { types?: string[]; limit?: number }) =>
            [...queryKeys.manager.all, "validations", scope, params?.types?.join(",") ?? "", params?.limit ?? 100] as const,
        talentRequestsRoot: () => [...queryKeys.manager.all, "talent-requests"] as const,
        talentRequestsList: (filters?: Record<string, unknown>) =>
            [...queryKeys.manager.talentRequestsRoot(), "list", filters ?? {}] as const,
        talentRequestsSummary: () => [...queryKeys.manager.talentRequestsRoot(), "summary"] as const,
        talentRequestDetail: (id: string) => [...queryKeys.manager.talentRequestsRoot(), "detail", id] as const,
    },
} as const;
