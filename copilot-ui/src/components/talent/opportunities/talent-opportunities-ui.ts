import type {
    RecommendationType,
    ScoreTier,
    SkillFitStatus,
} from "@/types/talent-opportunities";
import { formatViabilityScoreDisplay } from "@/utils/format";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export const SCORE_TIER_TONES: Record<ScoreTier, BadgeTone> = {
    excellent: "emerald",
    good: "blue",
    fair: "amber",
    weak: "slate",
};

export const RECO_TONES: Record<RecommendationType, BadgeTone> = {
    redeploy: "blue",
    training: "amber",
    recruitment: "violet",
};

export const SKILL_STATUS_TONES: Record<SkillFitStatus, BadgeTone> = {
    match: "emerald",
    gap: "amber",
    critical_gap: "red",
};

export const SKILL_STATUS_LABELS: Record<SkillFitStatus, string> = {
    match: "Aligné",
    gap: "Écart",
    critical_gap: "Écart critique",
};

export const PRIORITY_TONES: Record<"high" | "medium" | "low", BadgeTone> = {
    high: "red",
    medium: "amber",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/50",
    violet: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200",
    orange: "bg-orange-50 text-orange-800 ring-orange-200",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone]);
}

export function formatOpportunityScore(score: number): string {
    const f = formatViabilityScoreDisplay(score);
    if (f.value === "—") return "—";
    return `${f.value}${f.unit}`;
}

export type TalentOpportunitiesDensity = "compact" | "comfortable";

export const TALENT_OPPORTUNITIES_DENSITY_KEY = "talent_opportunities_density";

export function readTalentOpportunitiesDensity(): TalentOpportunitiesDensity {
    try {
        const raw = localStorage.getItem(TALENT_OPPORTUNITIES_DENSITY_KEY);
        return raw === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function writeTalentOpportunitiesDensity(density: TalentOpportunitiesDensity): void {
    try {
        localStorage.setItem(TALENT_OPPORTUNITIES_DENSITY_KEY, density);
    } catch {
        /* ignore */
    }
}

export function formatIsoDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export const DEFAULT_MIN_SCORE = 6.5;
