import { GraduationCap, Pause, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import type { RecommendationType, RhMatchingTopMatch } from "@/types/rh-matching.types";

export interface RecommendationConfig {
    label: string;
    description: string;
    icon: LucideIcon;
    badgeCls: string;
    dotCls: string;
    borderCls: string;
    segmentActiveCls: string;
    tone: "success" | "info" | "warning" | "muted";
}

export const RECOMMENDATION_CONFIG: Record<RecommendationType, RecommendationConfig> = {
    redeploy: {
        label: "Redéploiement",
        description: "Profil interne idéal pour ce projet",
        icon: Sparkles,
        badgeCls:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        dotCls: "bg-emerald-500",
        borderCls: "border-l-emerald-500",
        segmentActiveCls: "bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-950/40 dark:text-emerald-200",
        tone: "success",
    },
    training: {
        label: "Formation",
        description: "Talent prometteur, formation ciblée requise",
        icon: GraduationCap,
        badgeCls:
            "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        dotCls: "bg-blue-500",
        borderCls: "border-l-blue-500",
        segmentActiveCls: "bg-blue-100 text-blue-700 font-medium dark:bg-blue-950/40 dark:text-blue-200",
        tone: "info",
    },
    recruitment: {
        label: "Recrutement",
        description: "Aucun match interne, recrutement externe requis",
        icon: UserPlus,
        badgeCls:
            "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        dotCls: "bg-orange-500",
        borderCls: "border-l-orange-500",
        segmentActiveCls: "bg-orange-100 text-orange-700 font-medium dark:bg-orange-950/40 dark:text-orange-200",
        tone: "warning",
    },
    bench: {
        label: "Bench",
        description: "Talent disponible mais pas pertinent pour ce besoin",
        icon: Pause,
        badgeCls:
            "bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        dotCls: "bg-slate-400",
        borderCls: "border-l-slate-400",
        segmentActiveCls: "bg-slate-100 text-slate-600 font-medium dark:bg-slate-900/40 dark:text-slate-300",
        tone: "muted",
    },
};

export const RECOMMENDATION_TYPES: RecommendationType[] = ["redeploy", "training", "recruitment", "bench"];

const LEGACY_MAP: Record<string, RecommendationType> = {
    recommended: "redeploy",
    possible: "training",
    potential: "recruitment",
};

/** Normalise une valeur backend (PDF strict ou legacy) vers `RecommendationType`. */
export function normalizeRecommendationType(raw: string | null | undefined): RecommendationType {
    const v = raw?.trim().toLowerCase();
    if (!v) return "recruitment";
    if (v in RECOMMENDATION_CONFIG) return v as RecommendationType;
    return LEGACY_MAP[v] ?? "recruitment";
}

/** Getter sûr — fallback `recruitment` si valeur future inconnue. */
export function getRecommendationConfig(type: string | null | undefined): RecommendationConfig {
    return RECOMMENDATION_CONFIG[normalizeRecommendationType(type)];
}

export function countRecommendationTypes(
    items: Pick<RhMatchingTopMatch, "recommendation_type">[],
): Record<RecommendationType, number> {
    const counts: Record<RecommendationType, number> = {
        redeploy: 0,
        training: 0,
        recruitment: 0,
        bench: 0,
    };
    for (const item of items) {
        counts[normalizeRecommendationType(item.recommendation_type)] += 1;
    }
    return counts;
}

export function buildMatchingNarrativeFallback(
    matches: RhMatchingTopMatch[],
    matchNarrative: string | null,
    totalEvaluated?: number,
): string | null {
    if (matchNarrative?.trim()) return matchNarrative.trim();
    if (matches.length === 0) return null;

    const counts = countRecommendationTypes(matches);
    const total = totalEvaluated ?? matches.length;
    const top = matches[0];

    let message = `${total} candidat(s) évalué(s). `;
    if (counts.redeploy > 0) message += `${counts.redeploy} prêt(s) à mobiliser. `;
    if (counts.training > 0) message += `${counts.training} à former. `;
    if (counts.recruitment > 0) message += `${counts.recruitment} recrutement(s) suggéré(s). `;
    if (counts.bench > 0) message += `${counts.bench} en bench. `;
    if (top) message += `Top : ${top.talent_name} (${top.overall_score}/10).`;

    return message.trim();
}
