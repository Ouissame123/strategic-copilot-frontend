import type { DecisionLogDecision, DecisionLogStatus } from "@/services/decisions.api";
import { normalizeDecisionKind, type DecisionKind } from "@/utils/decisionLogHelpers";
import { parseDecision, type ParsedDecision } from "@/lib/parse-decision";

export type DecisionTypeFilter = "all" | "Continue" | "Adjust" | "Stop";

export type ManagerDecisionGroup = {
    key: string;
    project_id: string | null;
    project_name: string | null;
    decision: DecisionKind;
    decisionLabel: string;
    score: number;
    confidence: number | null;
    scope: string;
    reason_code: string;
    status: DecisionLogStatus;
    handled_at: string | null;
    latest_at: string;
    count: number;
    /** Décision la plus récente (actions Valider/Rejeter) */
    primary: DecisionLogDecision;
    occurrences: DecisionLogDecision[];
    parsed: ParsedDecision;
    rawSynthesis: string;
};

export type DecisionDaySection = {
    dayKey: string;
    label: string;
    groups: ManagerDecisionGroup[];
};

export type ClientDecisionStats = {
    total: number;
    continue: number;
    adjust: number;
    stop: number;
    other: number;
    avgScore: number | null;
};

export const DECISION_TYPE_FILTERS: { id: DecisionTypeFilter; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "Continue", label: "Continue" },
    { id: "Adjust", label: "Adjust" },
    { id: "Stop", label: "Stop" },
];

export const DECISION_BADGE_CLASS: Record<DecisionKind, string> = {
    continue: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    adjust: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800",
    stop: "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800",
    other: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700",
};

export const DECISION_DOT_CLASS: Record<DecisionKind, string> = {
    continue: "bg-emerald-500",
    adjust: "bg-amber-500",
    stop: "bg-rose-500",
    other: "bg-slate-400",
};

export const DECISION_LABEL: Record<DecisionKind, string> = {
    continue: "Continue",
    adjust: "Adjust",
    stop: "Stop",
    other: "Autre",
};

export const SCOPE_LABELS: Record<string, string> = {
    orchestrator_synthesize: "Agent 7 Orchestrateur",
    strategist_execute: "Agent 3 Strategist",
    arbitrage_accept: "Manager",
    project_detail: "Agent 1 Observer",
};

function createdAtMs(iso: string): number {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : 0;
}

/** Score arrondi à 0.01 pour la clé de regroupement. */
export function roundScoreKey(score: number): string {
    const n = Number(score);
    if (!Number.isFinite(n)) return "0.00";
    return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Clé de regroupement doublons :
 * même projet + même type de décision + même score arrondi à 0.01
 */
export function decisionGroupKey(d: DecisionLogDecision): string {
    const project = (d.project_id ?? d.project_name ?? "").trim().toLowerCase();
    const kind = normalizeDecisionKind(d.decision);
    return `${project}|${kind}|${roundScoreKey(Number(d.score ?? 0))}`;
}

export function readConfidence(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n > 0 && n <= 1) return Math.round(n * 100);
    return Math.round(n);
}

export function groupDecisions(decisions: DecisionLogDecision[]): ManagerDecisionGroup[] {
    const map = new Map<string, ManagerDecisionGroup>();

    for (const d of decisions) {
        const key = decisionGroupKey(d);
        const kind = normalizeDecisionKind(d.decision);
        const existing = map.get(key);
        if (!existing) {
            const parsed = parseDecision(d.synthesis);
            map.set(key, {
                key,
                project_id: d.project_id,
                project_name: d.project_name,
                decision: kind,
                decisionLabel: DECISION_LABEL[kind],
                score: Number(d.score ?? 0),
                confidence: readConfidence(d.confidence),
                scope: d.scope,
                reason_code: d.reason_code,
                status: d.status ?? "open",
                handled_at: d.handled_at,
                latest_at: d.created_at,
                count: 1,
                primary: d,
                occurrences: [d],
                parsed,
                rawSynthesis: d.synthesis ?? "",
            });
            continue;
        }

        existing.count += 1;
        existing.occurrences.push(d);

        if (createdAtMs(d.created_at) >= createdAtMs(existing.latest_at)) {
            existing.latest_at = d.created_at;
            existing.primary = d;
            existing.status = d.status ?? "open";
            existing.handled_at = d.handled_at;
            existing.confidence = readConfidence(d.confidence);
            existing.scope = d.scope;
            existing.reason_code = d.reason_code;
            existing.project_name = d.project_name ?? existing.project_name;
            existing.project_id = d.project_id ?? existing.project_id;
            existing.score = Number(d.score ?? existing.score);
            existing.parsed = parseDecision(d.synthesis);
            existing.rawSynthesis = d.synthesis ?? existing.rawSynthesis;
        }
    }

    for (const group of map.values()) {
        group.occurrences.sort((a, b) => createdAtMs(b.created_at) - createdAtMs(a.created_at));
    }

    return Array.from(map.values()).sort((a, b) => createdAtMs(b.latest_at) - createdAtMs(a.latest_at));
}

export function filterGroupsByDecisionType(
    groups: ManagerDecisionGroup[],
    type: DecisionTypeFilter,
): ManagerDecisionGroup[] {
    if (type === "all") return groups;
    const kind = type.toLowerCase() as DecisionKind;
    return groups.filter((g) => g.decision === kind);
}

export function countGroupsByDecisionType(groups: ManagerDecisionGroup[]): Record<DecisionTypeFilter, number> {
    return {
        all: groups.length,
        Continue: groups.filter((g) => g.decision === "continue").length,
        Adjust: groups.filter((g) => g.decision === "adjust").length,
        Stop: groups.filter((g) => g.decision === "stop").length,
    };
}

export function computeClientStats(groups: ManagerDecisionGroup[]): ClientDecisionStats {
    const stats: ClientDecisionStats = {
        total: groups.length,
        continue: 0,
        adjust: 0,
        stop: 0,
        other: 0,
        avgScore: null,
    };
    if (!groups.length) return stats;

    let sum = 0;
    for (const g of groups) {
        if (g.decision === "continue") stats.continue += 1;
        else if (g.decision === "adjust") stats.adjust += 1;
        else if (g.decision === "stop") stats.stop += 1;
        else stats.other += 1;
        const s = Number(g.score);
        if (Number.isFinite(s)) sum += s;
    }
    stats.avgScore = Math.round((sum / groups.length) * 100) / 100;
    return stats;
}

/** Regroupe par jour calendaire (fr-FR), antichronologique. */
export function partitionGroupsByDay(groups: ManagerDecisionGroup[]): DecisionDaySection[] {
    const byDay = new Map<string, ManagerDecisionGroup[]>();

    for (const g of groups) {
        const d = new Date(g.latest_at);
        const dayKey = Number.isNaN(d.getTime())
            ? "unknown"
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const list = byDay.get(dayKey) ?? [];
        list.push(g);
        byDay.set(dayKey, list);
    }

    const sections: DecisionDaySection[] = [];
    const keys = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

    for (const dayKey of keys) {
        const items = (byDay.get(dayKey) ?? []).sort(
            (a, b) => createdAtMs(b.latest_at) - createdAtMs(a.latest_at),
        );
        let label = "Date inconnue";
        if (dayKey !== "unknown") {
            const [y, m, day] = dayKey.split("-").map(Number);
            const date = new Date(y!, m! - 1, day!);
            label = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        }
        sections.push({ dayKey, label, groups: items });
    }

    return sections;
}

export function formatOccurrenceRange(occurrences: DecisionLogDecision[]): string {
    if (!occurrences.length) return "";
    const times = occurrences
        .map((o) => createdAtMs(o.created_at))
        .filter((t) => t > 0)
        .sort((a, b) => a - b);
    if (!times.length) return `${occurrences.length} occurrence${occurrences.length > 1 ? "s" : ""}`;

    const fmt = (ms: number) =>
        new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const n = occurrences.length;
    if (n === 1) return `émise 1 fois à ${fmt(times[0]!)}`;
    return `émise ${n} fois entre ${fmt(times[0]!)} et ${fmt(times[times.length - 1]!)}`;
}

export function formatDecisionTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function scoreToneClass(score: number): string {
    if (score >= 7) return "bg-emerald-500";
    if (score >= 4) return "bg-amber-500";
    return "bg-rose-500";
}

export function scoreTextClass(score: number): string {
    if (score >= 7) return "text-emerald-700 dark:text-emerald-300";
    if (score >= 4) return "text-amber-700 dark:text-amber-300";
    return "text-rose-700 dark:text-rose-300";
}

export function formatScoreAria(score: number): string {
    const n = Number.isFinite(score) ? score : 0;
    const fr = n.toFixed(2).replace(".", ",");
    return `Score ${fr} sur 10`;
}

export function lowestScoreGroup(groups: ManagerDecisionGroup[]): ManagerDecisionGroup | null {
    const open = groups.filter((g) => g.status === "open");
    const pool = open.length ? open : groups;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => Number(a.score) - Number(b.score))[0] ?? null;
}

export function emptyStateForType(type: DecisionTypeFilter): { title: string; description: string } {
    if (type === "Continue") {
        return {
            title: "Aucune décision Continue",
            description: "Aucune décision Continue pour cette période.",
        };
    }
    if (type === "Adjust") {
        return {
            title: "Aucune décision Adjust",
            description: "Aucune décision Adjust pour cette période.",
        };
    }
    if (type === "Stop") {
        return {
            title: "Aucune décision Stop",
            description: "Aucune décision Stop pour cette période.",
        };
    }
    return {
        title: "Aucune décision",
        description: "Aucune décision pour les filtres sélectionnés.",
    };
}
