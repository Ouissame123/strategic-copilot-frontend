import { resolveRequirementCoverage } from "@/components/manager/mission-control/requirement-utils";
import { normalizeId } from "@/components/project-mission-control/utils";
import type { CopilotDecision } from "@/services/decisions.api";
import type { AlertItem, ArbitrageOption, ProjectDetailResponse } from "@/types/api.types";
import type { ProjectRequirement } from "@/types/manager-project-requirements.types";

export type MissionControlInsightAgent = "watchdog" | "analyst" | "matchmaker" | "strategist" | "copilot";

export type MissionControlInsightCard = {
    id: string;
    source_agent: MissionControlInsightAgent;
    type: string;
    target_ref: string;
    title: string;
    explanation: string;
    why_detail: string;
    fingerprint: string;
    sort_score: number;
    duplicate_count: number;
    apply_action: "risks" | "analysis" | "matchmaker" | "ai-history" | "requirements";
};

const AGENT_ORDER: MissionControlInsightAgent[] = ["watchdog", "analyst", "matchmaker", "strategist", "copilot"];

function hoursSince(iso: string | undefined): number | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    return (Date.now() - t) / 3_600_000;
}

function recencyWeight(iso: string | undefined): number {
    const h = hoursSince(iso);
    if (h == null) return 0;
    if (h <= 24) return 1;
    if (h <= 72) return 0.7;
    if (h <= 168) return 0.4;
    return 0.2;
}

function severityFromAlert(a: AlertItem): number {
    const s = String(a.severity ?? "").toLowerCase();
    if (s.includes("crit")) return 1;
    if (s.includes("high")) return 0.75;
    if (s.includes("med")) return 0.5;
    return 0.35;
}

function truncate(text: string, max: number): string {
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

function pushInsight(
    bag: MissionControlInsightCard[],
    card: Omit<MissionControlInsightCard, "sort_score" | "duplicate_count" | "fingerprint"> & {
        severity_weight: number;
        actionability_weight: number;
        created_at?: string;
    },
) {
    const fingerprint = `${card.source_agent}|${card.type}|${card.target_ref}`;
    const recency = recencyWeight(card.created_at);
    const sort_score = card.severity_weight * 3 + recency * 2 + card.actionability_weight;
    bag.push({
        ...card,
        fingerprint,
        sort_score,
        duplicate_count: 1,
    });
}

function mergeDuplicates(cards: MissionControlInsightCard[]): MissionControlInsightCard[] {
    const map = new Map<string, MissionControlInsightCard>();
    for (const c of cards) {
        const prev = map.get(c.fingerprint);
        if (!prev) {
            map.set(c.fingerprint, { ...c });
            continue;
        }
        map.set(c.fingerprint, {
            ...prev,
            duplicate_count: prev.duplicate_count + 1,
            sort_score: Math.max(prev.sort_score, c.sort_score),
        });
    }
    return [...map.values()];
}

function pickDiverseTop(cards: MissionControlInsightCard[], limit = 3): MissionControlInsightCard[] {
    const sorted = [...cards].sort((a, b) => b.sort_score - a.sort_score);
    const picked: MissionControlInsightCard[] = [];
    const usedAgents = new Set<MissionControlInsightAgent>();

    for (const c of sorted) {
        if (picked.length >= limit) break;
        if (usedAgents.has(c.source_agent) && picked.length < limit - 1) continue;
        picked.push(c);
        usedAgents.add(c.source_agent);
    }

    if (picked.length < limit) {
        for (const c of sorted) {
            if (picked.length >= limit) break;
            if (picked.some((p) => p.id === c.id)) continue;
            picked.push(c);
        }
    }

    return picked;
}

function alertsToInsights(alerts: AlertItem[]): MissionControlInsightCard[] {
    const out: MissionControlInsightCard[] = [];
    for (const a of alerts) {
        const agentRaw = String(a.source_agent ?? "watchdog").toLowerCase();
        const source_agent: MissionControlInsightAgent =
            agentRaw.includes("analyst") ? "analyst" : agentRaw.includes("strategist") ? "strategist" : "watchdog";
        const type = String(a.category ?? a.risk_type ?? "risk_alert").trim() || "risk_alert";
        const title = truncate(String(a.title ?? a.message ?? "Alerte projet"), 60);
        const explanation = truncate(String(a.message ?? a.description ?? a.rationale ?? ""), 100);
        pushInsight(out, {
            id: `alert-${a.id ?? a.alert_id ?? title}`,
            source_agent,
            type,
            target_ref: String(a.id ?? a.alert_id ?? title),
            title,
            explanation: explanation || "Signal de risque actif sur le projet.",
            why_detail: String(a.rationale ?? a.reason ?? a.message ?? ""),
            severity_weight: severityFromAlert(a),
            actionability_weight: 0.8,
            created_at: a.detected_at,
            apply_action: "risks",
        });
    }
    return out;
}

function viabilityToInsights(detail: ProjectDetailResponse | undefined): MissionControlInsightCard[] {
    const v = detail?.latest_viability;
    if (!v) return [];
    const out: MissionControlInsightCard[] = [];
    const title = truncate(`Viabilité ${String(v.decision ?? "—")}`, 60);
    const explanation = truncate(String(v.explanation ?? "Dernier verdict Analyst disponible."), 100);
    pushInsight(out, {
        id: `viability-${v.computed_at ?? "latest"}`,
        source_agent: "analyst",
        type: "viability_verdict",
        target_ref: String(v.decision ?? "viability"),
        title,
        explanation,
        why_detail: String(v.explanation ?? ""),
        severity_weight: 0.65,
        actionability_weight: 0.75,
        created_at: v.computed_at,
        apply_action: "analysis",
    });
    return out;
}

function requirementsToInsights(requirements: ProjectRequirement[]): MissionControlInsightCard[] {
    const out: MissionControlInsightCard[] = [];
    for (const r of requirements) {
        const status = resolveRequirementCoverage(r.level_required, r.best_pool_level);
        if (status !== "uncovered" && status !== "partial") continue;
        const skill = String(r.skill_name ?? r.skill_id ?? "compétence").trim();
        pushInsight(out, {
            id: `req-${r.requirement_id ?? skill}`,
            source_agent: "matchmaker",
            type: "skills_gap",
            target_ref: skill,
            title: truncate(status === "uncovered" ? `Écart critique : ${skill}` : `Couverture partielle : ${skill}`, 60),
            explanation: truncate(`Niveau requis ${r.level_required ?? "—"} — écart sur le vivier projet.`, 100),
            why_detail: `Exigence ${skill} : statut ${status}.`,
            severity_weight: status === "uncovered" ? 0.9 : 0.6,
            actionability_weight: 0.85,
            created_at: undefined,
            apply_action: "requirements",
        });
    }
    return out;
}

function arbitrageToInsights(options: ArbitrageOption[]): MissionControlInsightCard[] {
    const out: MissionControlInsightCard[] = [];
    for (const o of options) {
        const type = String(o.option_type ?? "arbitrage").trim() || "arbitrage";
        pushInsight(out, {
            id: `arb-${o.id}`,
            source_agent: "strategist",
            type,
            target_ref: o.id,
            title: truncate(o.label || "Option d'arbitrage", 60),
            explanation: truncate(o.rationale || "Piste Strategist proposée pour le projet.", 100),
            why_detail: o.rationale,
            severity_weight: Math.min(1, (Number(o.impact_score) || 0) / 10),
            actionability_weight: 0.7,
            created_at: o.created_at,
            apply_action: "ai-history",
        });
    }
    return out;
}

function decisionsToInsights(decisions: CopilotDecision[]): MissionControlInsightCard[] {
    const out: MissionControlInsightCard[] = [];
    for (const d of decisions) {
        const type = String(d.payload?.reason_code ?? d.decision ?? "copilot_decision").toLowerCase();
        pushInsight(out, {
            id: `copilot-${d.id}`,
            source_agent: "copilot",
            type,
            target_ref: String(d.id),
            title: truncate(String(d.decision ?? "Décision Copilot"), 60),
            explanation: truncate(String(d.reason ?? ""), 100),
            why_detail: String(d.reason ?? ""),
            severity_weight: String(d.decision).toLowerCase() === "adjust" ? 0.7 : 0.5,
            actionability_weight: 0.6,
            created_at: d.created_at,
            apply_action: "analysis",
        });
    }
    return out;
}

export function buildMissionControlInsights(input: {
    projectId: string;
    projectName: string;
    detail?: ProjectDetailResponse;
    decisions: CopilotDecision[];
    requirements?: ProjectRequirement[];
}): MissionControlInsightCard[] {
    const pidNorm = normalizeId(input.projectId);
    const nameNorm = input.projectName.trim().toLowerCase();

    const projectDecisions = input.decisions.filter((d) => {
        const dPid = normalizeId(d.project_id);
        if (pidNorm && dPid && dPid === pidNorm) return true;
        const dName = String(d.project_name ?? "").trim().toLowerCase();
        return Boolean(nameNorm && dName && dName === nameNorm);
    });

    const raw: MissionControlInsightCard[] = [
        ...alertsToInsights(input.detail?.active_alerts ?? []),
        ...viabilityToInsights(input.detail),
        ...requirementsToInsights(input.requirements ?? []),
        ...arbitrageToInsights(input.detail?.arbitrage_options ?? []),
        ...decisionsToInsights(projectDecisions),
    ];

    const deduped = mergeDuplicates(raw);
    const diverse = pickDiverseTop(deduped, 3);

    const agentSlots = new Set(diverse.map((d) => d.source_agent));
    for (const agent of AGENT_ORDER) {
        if (diverse.length >= 3) break;
        if (agentSlots.has(agent)) continue;
        const fallback = deduped.find((c) => c.source_agent === agent);
        if (fallback) {
            diverse.push(fallback);
            agentSlots.add(agent);
        }
    }

    return diverse.slice(0, 3);
}
