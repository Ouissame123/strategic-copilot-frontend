import type {
    ArbitrageOptionType,
    DashboardAgentKey,
    DashboardDecision,
    DashboardUrgency,
    HealthLabel,
    RiskSeverity,
} from "@/features/manager/types/dashboard-v3";

const FALLBACK = "Non précisé";

function lookup(map: Record<string, string>, code: string | null | undefined): string {
    if (code == null || String(code).trim() === "") return FALLBACK;
    const key = String(code).trim();
    return map[key] ?? map[key.toLowerCase()] ?? FALLBACK;
}

export const AGENT_LABELS: Record<DashboardAgentKey, string> = {
    observer: "Observateur",
    watchdog: "Sentinelle",
    strategist: "Stratège",
    matchmaker: "Matching",
    analyst: "Analyste",
    helper: "Assistant",
    orchestrator: "Copilote",
};

export const AGENT_QUESTIONS: Record<DashboardAgentKey, string> = {
    observer: "Où en sont vraiment les projets ?",
    watchdog: "Qu'est-ce qui peut mal tourner ?",
    strategist: "Quelles options d'arbitrage ?",
    matchmaker: "Qui peut combler les écarts ?",
    analyst: "Comment va l'équipe ?",
    helper: "Quelles actions attendent une validation ?",
    orchestrator: "Quelle synthèse pour décider ?",
};

const DECISION_LABELS: Record<string, string> = {
    Continue: "Poursuivre",
    continue: "Poursuivre",
    Proceed: "Poursuivre",
    proceed: "Poursuivre",
    Adjust: "Ajuster",
    adjust: "Ajuster",
    Stop: "Arrêter",
    stop: "Arrêter",
    Reject: "Arrêter",
    reject: "Arrêter",
    unscored: "Non analysé",
};

const SEVERITY_LABELS: Record<string, string> = {
    critical: "Critique",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
};

const URGENCY_LABELS: Record<string, string> = {
    critical: "Critique",
    high: "Haute",
    medium: "Moyenne",
    low: "Faible",
};

const HEALTH_LABELS: Record<string, string> = {
    healthy: "Sain",
    watch: "Sous surveillance",
    attention: "Attention",
    critical: "Critique",
};

const ARBITRAGE_TYPE_LABELS: Record<string, string> = {
    reallocation: "Réaffectation",
    delay: "Report",
    reinforce: "Renfort",
    stop_scope: "Réduction de périmètre",
};

const MOBILITY_LABELS: Record<string, string> = {
    stable: "Stable",
    watch: "À surveiller",
    at_risk: "À risque",
};

const RISK_TYPE_LABELS: Record<string, string> = {
    overload: "Surcharge",
    skill_gap: "Écart de compétences",
    skills_gap: "Écart de compétences",
    conflict: "Conflit",
    turnover: "Turnover",
    capacity: "Capacité",
    budget: "Budget",
    deadline: "Échéance",
    fragility: "Fragilité",
};

const IMPACT_KEY_LABELS: Record<string, string> = {
    delta_viability: "Impact viabilité",
    delta_capacity: "Impact charge",
    delta_budget: "Impact budget",
    delta_risk: "Impact risque",
    delay_days: "Jours de report",
    cost_impact: "Impact coût",
    talent_count: "Talents concernés",
    summary: "Résumé",
};

const SCORE_DIM_LABELS: Record<string, string> = {
    skills: "Compétences",
    skills_fit: "Compétences",
    capacity: "Charge",
    budget: "Budget",
    risk: "Risque",
};

export function labelAgent(key: DashboardAgentKey | string): string {
    return AGENT_LABELS[key as DashboardAgentKey] ?? FALLBACK;
}

export function labelDecision(code: DashboardDecision | string | null | undefined): string {
    return lookup(DECISION_LABELS, code == null ? "unscored" : String(code));
}

export function labelSeverity(code: RiskSeverity | string | null | undefined): string {
    return lookup(SEVERITY_LABELS, code);
}

export function labelUrgency(code: DashboardUrgency | string | null | undefined): string {
    return lookup(URGENCY_LABELS, code);
}

export function labelHealth(code: HealthLabel | string | null | undefined): string {
    return lookup(HEALTH_LABELS, code);
}

export function labelArbitrageType(code: ArbitrageOptionType | string | null | undefined): string {
    return lookup(ARBITRAGE_TYPE_LABELS, code);
}

export function labelMobility(code: string | null | undefined): string {
    return lookup(MOBILITY_LABELS, code);
}

export function labelRiskType(code: string | null | undefined): string {
    if (code == null || !String(code).trim()) return FALLBACK;
    const raw = String(code).trim();
    const mapped = RISK_TYPE_LABELS[raw] ?? RISK_TYPE_LABELS[raw.toLowerCase()];
    if (mapped) return mapped;
    return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelImpactKey(code: string): string {
    return IMPACT_KEY_LABELS[code] ?? IMPACT_KEY_LABELS[code.toLowerCase()] ?? FALLBACK;
}

export function labelScoreDim(code: string): string {
    return SCORE_DIM_LABELS[code] ?? SCORE_DIM_LABELS[code.toLowerCase()] ?? FALLBACK;
}

export function labelOrFallback(code: string | null | undefined, map: Record<string, string>): string {
    return lookup(map, code);
}
