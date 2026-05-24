import type { DecisionLabel, ProjectListItem, ProjectStatus } from "@/types/api.types";

/**
 * Contrat GET `/manager/projects` (Manager_Projects list) — champs garantis par le workflow actuel.
 */
export interface ManagerProjectListItemApi {
    id: string;
    name: string;
    status: ProjectStatus;
    priority: number;
    milestone_at: string | null;
    team_size: number;
    progress_pct: number | null;
    active_alerts_count: number;
    latest_viability_score: number | null;
    latest_decision: DecisionLabel | null;
}

/**
 * Champs enrichis côté UI tant que Manager_Projects ne les expose pas.
 * Chaque helper documente le champ backend à ajouter (`TODO BACK`).
 */
export type ManagerProjectReasonCode =
    | "overdue_milestone"
    | "milestone_soon"
    | "low_viability"
    | "high_alert_load"
    | "decision_adjust"
    | "decision_stop"
    | "stable";

export interface ManagerProjectDerivedFields {
    reason_code: ManagerProjectReasonCode;
    /** TODO BACK: expose `fragility_score` (ou sous-score risque) dans Manager_Projects list. */
    fragility_score: number | null;
    /** TODO BACK: expose `score_trend_7d` (delta viabilité sur 7 jours). */
    score_trend_7d: number | null;
    /** TODO BACK: expose `time_to_impact_days` (impact métier, pas seulement jalon). */
    time_to_impact_days: number | null;
    /**
     * Clé i18n `managerWorkspace.projects.<key>` (heuristique UI).
     * TODO BACK: expose `top_arbitrage` (libellé option Strategist / dernière reco).
     */
    top_arbitrage: TopArbitrageKey | null;
}

export type TopArbitrageKey =
    | "arbitrage_stop"
    | "arbitrage_overdue"
    | "arbitrage_adjust"
    | "arbitrage_alerts"
    | "arbitrage_milestone";

export type ManagerProjectPortfolioItem = ProjectListItem & ManagerProjectDerivedFields;

const REASON_RANK: Record<ManagerProjectReasonCode, number> = {
    decision_stop: 0,
    overdue_milestone: 1,
    decision_adjust: 2,
    low_viability: 3,
    high_alert_load: 4,
    milestone_soon: 5,
    stable: 9,
};

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeDecision(project: ProjectListItem): string {
    return String(project.latest_decision ?? project.decision ?? "")
        .trim()
        .toLowerCase();
}

/** Jours jusqu’au jalon (`milestone_at` − aujourd’hui, arrondi). */
export function deriveTimeToImpactDays(project: ProjectListItem, now = Date.now()): number | null {
    const raw = project.milestone_at;
    if (raw == null || String(raw).trim() === "") return null;
    const m = new Date(raw as string);
    if (Number.isNaN(m.getTime())) return null;
    return Math.floor((m.getTime() - now) / 86_400_000);
}

/** Proxy fragilité : `10 − viabilité` (échelle 0–10). */
export function deriveFragilityScore(project: ProjectListItem): number | null {
    const viability = coerceFiniteNumber(project.latest_viability_score);
    if (viability == null) return null;
    const frag = 10 - viability;
    return Math.round(Math.max(0, Math.min(10, frag)) * 10) / 10;
}

/** Pas d’historique en liste — null jusqu’à série temporelle backend. */
export function deriveScoreTrend7d(_project: ProjectListItem): number | null {
    // TODO BACK: expose score_trend_7d (ex. viabilité J0 − viabilité J-7).
    return null;
}

export function deriveReasonCode(project: ProjectListItem, now = Date.now()): ManagerProjectReasonCode {
    const decision = normalizeDecision(project);
    const viability = coerceFiniteNumber(project.latest_viability_score);
    const alerts = Math.round(coerceFiniteNumber(project.active_alerts_count) ?? 0);
    const days = deriveTimeToImpactDays(project, now);

    if (decision === "stop" || decision === "reject") return "decision_stop";
    if (days != null && days < 0) return "overdue_milestone";
    if (decision === "adjust") return "decision_adjust";
    if (viability != null && viability < 5) return "low_viability";
    if (alerts >= 3) return "high_alert_load";
    if (days != null && days >= 0 && days <= 14) return "milestone_soon";
    return "stable";
}

/** Heuristique Copilot / Strategist — clé i18n, pas de texte figé par langue. */
export function deriveTopArbitrage(project: ProjectListItem, reason: ManagerProjectReasonCode): TopArbitrageKey | null {
    const decision = normalizeDecision(project);

    if (decision === "stop" || decision === "reject" || reason === "decision_stop") {
        return "arbitrage_stop";
    }
    if (reason === "overdue_milestone") {
        return "arbitrage_overdue";
    }
    if (reason === "decision_adjust" || decision === "adjust") {
        return "arbitrage_adjust";
    }
    if (reason === "low_viability" || reason === "high_alert_load") {
        return "arbitrage_alerts";
    }
    if (reason === "milestone_soon") {
        return "arbitrage_milestone";
    }
    return null;
}

export function enrichManagerProjectListItem(project: ProjectListItem, now = Date.now()): ManagerProjectPortfolioItem {
    const reason_code = deriveReasonCode(project, now);
    return {
        ...project,
        reason_code,
        fragility_score: deriveFragilityScore(project),
        score_trend_7d: deriveScoreTrend7d(project),
        time_to_impact_days: deriveTimeToImpactDays(project, now),
        top_arbitrage: deriveTopArbitrage(project, reason_code),
    };
}

export function enrichManagerProjectListItems(items: ProjectListItem[]): ManagerProjectPortfolioItem[] {
    const now = Date.now();
    return items.map((p) => enrichManagerProjectListItem(p, now));
}

export function reasonCodeRank(code: ManagerProjectReasonCode): number {
    return REASON_RANK[code] ?? 8;
}
