import type {
    RecommendationType,
    ScoreTier,
    SkillFitStatus,
} from "@/types/talent-opportunities";
import { formatViabilityScoreDisplay } from "@/utils/format";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export type OpportunitySortKey = "overall" | "fit" | "name";

export const OPPORTUNITY_SORT_OPTIONS: { value: OpportunitySortKey; label: string }[] = [
    { value: "overall", label: "Score global" },
    { value: "fit", label: "Compatibilité" },
    { value: "name", label: "Nom" },
];

export type ScoreBadgeMeta = {
    label: string;
    tone: BadgeTone;
};

/** Seuils badge carte : Excellent ≥8.5, Bon ≥7, Correct ≥6, Faible &lt;6. */
export function resolveScoreBadge(score: number): ScoreBadgeMeta {
    if (score >= 8.5) return { label: "Excellent", tone: "emerald" };
    if (score >= 7) return { label: "Bon", tone: "blue" };
    if (score >= 6) return { label: "Correct", tone: "amber" };
    return { label: "Faible", tone: "slate" };
}

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
    blue: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50",
    violet: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50",
    orange: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/50",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone]);
}

export function outlineBadgeClass(): string {
    return "inline-flex items-center rounded-full border border-secondary bg-primary px-2.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/40 dark:border-secondary dark:bg-primary";
}

export function formatOpportunityScore(score: number): string {
    const f = formatViabilityScoreDisplay(score);
    if (f.value === "—") return "—";
    return `${f.value}${f.unit}`;
}

export function formatIsoDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export const DEFAULT_MIN_SCORE = 6.5;
export const SCORE_SLIDER_MIN = 6;
export const SCORE_SLIDER_MAX = 10;
export const SCORE_SLIDER_STEP = 0.1;
export const SCORE_SLIDER_TICKS = [6, 7, 8, 9, 10] as const;

/** Hauteur fixe du footer carte (bouton vs intérêt envoyé). */
export const OPPORTUNITY_CARD_FOOTER_CLASS = "mt-auto flex h-10 shrink-0 flex-wrap items-center gap-2 pt-1";
