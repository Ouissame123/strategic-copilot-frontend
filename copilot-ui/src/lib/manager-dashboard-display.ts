/** Couleur barre de viabilité (0–10) : emerald ≥7.5, amber ≥4, rose <4. */
export function viabilityBarColor(score: number): string {
    if (score >= 7.5) return "#10b981";
    if (score >= 4) return "#f59e0b";
    return "#f43f5e";
}

/** Affichage KPI Matchmaker ; cap visuel « 100+ » pour réaffectations tant que le back est erroné. */
export function formatMatchmakerStatDisplay(n: number | null, options?: { capOver100?: boolean }): string {
    if (n === null) return "—";
    if (options?.capOver100 && n > 100) return "100+";
    return String(n);
}

export function formatMatchmakerScore10(n: number | null): string {
    if (n === null) return "—";
    return `${n.toFixed(1)} / 10`;
}

/** Score compact pour listes Matchmaker (ex. `8.7/10`). */
export function formatMatchmakerScoreCompact(n: number | null): string {
    if (n === null) return "—";
    return `${n.toFixed(1)}/10`;
}

export const MANAGER_DASHBOARD_SECTION_IDS = {
    overview: "dashboard-section-overview",
    fragile: "dashboard-section-fragile",
    matchmaker: "dashboard-section-matchmaker",
    analyst: "dashboard-section-analyst",
} as const;

export type ManagerDashboardTabId = keyof typeof MANAGER_DASHBOARD_SECTION_IDS;
