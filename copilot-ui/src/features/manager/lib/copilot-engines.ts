import type { AgentStatus, DashboardResponse } from "@/features/manager/types/dashboard";

export type CopilotEngineKey =
    | "observer"
    | "watchdog"
    | "strategist"
    | "matchmaker"
    | "analyst"
    | "helper"
    | "orchestrator";

export const COPILOT_ENGINE_KEYS: CopilotEngineKey[] = [
    "observer",
    "watchdog",
    "strategist",
    "matchmaker",
    "analyst",
    "helper",
    "orchestrator",
];

export const COPILOT_ENGINE_CODENAMES: Record<CopilotEngineKey, string> = {
    observer: "Observer",
    watchdog: "Watchdog",
    strategist: "Strategist",
    matchmaker: "Matchmaker",
    analyst: "Analyst",
    helper: "Helper",
    orchestrator: "Orchestrator",
};

/** Ancres de scroll du tableau de bord manager. */
export const MANAGER_DASHBOARD_SECTION_IDS = {
    overview: "dashboard-section-overview",
    risk: "dashboard-section-risk",
    matchmaker: "dashboard-section-matchmaker",
    analyst: "dashboard-section-analyst",
    actions: "dashboard-section-actions",
} as const;

export type ManagerDashboardSectionId = keyof typeof MANAGER_DASHBOARD_SECTION_IDS;

export const COPILOT_ENGINE_SECTION: Record<CopilotEngineKey, ManagerDashboardSectionId> = {
    observer: "overview",
    watchdog: "risk",
    strategist: "actions",
    matchmaker: "matchmaker",
    analyst: "analyst",
    helper: "actions",
    orchestrator: "actions",
};

export function scrollToManagerDashboardSection(sectionId: ManagerDashboardSectionId) {
    document.getElementById(MANAGER_DASHBOARD_SECTION_IDS[sectionId])?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}

export function resolveEngineStatus(
    key: CopilotEngineKey,
    agentsStatus: DashboardResponse["agents_status"],
    agents: DashboardResponse["agents"],
): AgentStatus {
    const fromStatus = agentsStatus[key]?.status;
    if (fromStatus) return fromStatus;
    const active = agents[key]?.active;
    if (active === true) return "active";
    if (active === false) return "inactive";
    return "unknown";
}
