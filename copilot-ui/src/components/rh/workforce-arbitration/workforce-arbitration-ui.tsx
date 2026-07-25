/**
 * Composants UI — Workforce Arbitration (enterprise AI).
 */
import type { ReactNode } from "react";
import {
    AlertTriangle,
    Brain,
    ChevronDown,
    FolderKanban,
    GitBranch,
    Loader2,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import type { RhMatchingRunResponse, RhMatchingTopMatch } from "@/types/rh-matching.types";
import type { RhProjectOption } from "@/types/rh-matching.types";
import { RH_ALERT_ERROR, RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY, WS_TEXT_FAINT } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export const GLASS =
    "rounded-2xl border border-white/60 bg-white/70 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60 dark:shadow-black/20";

export const RECOMMENDATION_BADGE: Record<string, { label: string; cls: string }> = {
    recommended: {
        label: "Recommandé",
        cls: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300",
    },
    possible: {
        label: "Possible",
        cls: "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-200",
    },
    potential: {
        label: "Potentiel",
        cls: "bg-slate-500/10 text-slate-600 ring-1 ring-slate-400/30 dark:text-slate-300",
    },
};

export function recommendationBadge(type: string) {
    const key = type?.toLowerCase() ?? "potential";
    return RECOMMENDATION_BADGE[key] ?? RECOMMENDATION_BADGE.potential;
}

export function talentInitials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("");
}

function ScoreRing({ score, max = 10, size = 72 }: { score: number; max?: number; size?: number }) {
    const pct = Math.max(0, Math.min(100, (score / max) * 100));
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    className="text-slate-100 dark:text-slate-800"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out"
                />
                <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0e9384" />
                        <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tabular-nums text-primary-700 dark:text-primary-300">{score.toFixed(1)}</span>
                <span className={cx("text-[9px] uppercase tracking-wide", WS_TEXT_FAINT)}>/ {max}</span>
            </div>
        </div>
    );
}

type HeroKpi = {
    label: string;
    value: string;
    hint?: string;
    icon: ReactNode;
    accent: "violet" | "emerald" | "sky" | "amber";
};

const ACCENT_ICON: Record<HeroKpi["accent"], string> = {
    violet: "bg-primary-500/10 text-primary-600 dark:text-primary-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-primary-500/10 text-primary-600 dark:text-primary-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function MatchingHeroKpiStrip({ items }: { items: HeroKpi[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((kpi) => (
                <div
                    key={kpi.label}
                    className={cx(
                        GLASS,
                        "group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-xl",
                    )}
                >
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-500/5 blur-2xl transition group-hover:bg-primary-500/10" />
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className={cx("text-[10px] font-bold uppercase tracking-widest", WS_TEXT_FAINT)}>{kpi.label}</p>
                            <p className={cx("mt-1.5 text-2xl font-bold tabular-nums tracking-tight", RH_TEXT_PRIMARY)}>
                                {kpi.value}
                            </p>
                            {kpi.hint ? <p className={cx("mt-0.5 text-[11px]", RH_TEXT_MUTED)}>{kpi.hint}</p> : null}
                        </div>
                        <div className={cx("flex h-10 w-10 items-center justify-center rounded-xl", ACCENT_ICON[kpi.accent])}>
                            {kpi.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function MatchingHeroSection({ projectName }: { projectName?: string | null }) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-primary-200/40 bg-gradient-to-br from-primary-600/[0.08] via-white to-primary-500/[0.06] p-6 shadow-xl shadow-primary-500/5 dark:border-primary-500/20 dark:from-primary-950/40 dark:via-slate-950 dark:to-primary-950/30 md:p-8">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-primary-500/15 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-primary-500/40 blur-xl" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-600 text-white shadow-lg shadow-primary-500/30">
                            <GitBranch size={26} strokeWidth={2} aria-hidden />
                        </div>
                    </div>
                    <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                                WF_RH_Matching_Run
                            </span>
                            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                Strategic AI
                            </span>
                        </div>
                        <h1 className={cx("text-2xl font-bold tracking-tight md:text-3xl", RH_TEXT_PRIMARY)}>
                            Workforce Arbitration
                        </h1>
                        <p className={cx("mt-2 max-w-xl text-sm leading-relaxed md:text-base", RH_TEXT_MUTED)}>
                            AI-powered talent matching and strategic workforce balancing — compétences, disponibilité et
                            gaps en un seul arbitrage.
                        </p>
                        {projectName ? (
                            <p className={cx("mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300")}>
                                <FolderKanban size={12} aria-hidden />
                                Projet actif : {projectName}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-center lg:text-right">
                    <div>
                        <p className={cx("text-[10px] font-bold uppercase tracking-wider", WS_TEXT_FAINT)}>Moteur</p>
                        <p className={cx("text-sm font-semibold", RH_TEXT_SECONDARY)}>n8n + LLM</p>
                    </div>
                    <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                    <div>
                        <p className={cx("text-[10px] font-bold uppercase tracking-wider", WS_TEXT_FAINT)}>Top N</p>
                        <p className={cx("text-sm font-semibold tabular-nums", RH_TEXT_SECONDARY)}>10 talents</p>
                    </div>
                    <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                    <div>
                        <p className={cx("text-[10px] font-bold uppercase tracking-wider", WS_TEXT_FAINT)}>Dispo min.</p>
                        <p className={cx("text-sm font-semibold tabular-nums", RH_TEXT_SECONDARY)}>20%</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function MatchingEmptyState() {
    return (
        <div
            className={cx(
                GLASS,
                "relative overflow-hidden border-dashed border-primary-300/40 p-10 text-center md:p-14",
            )}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,147,132,0.08),transparent_70%)]" />
            <div className="relative mx-auto max-w-md">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-500/10 ring-1 ring-primary-500/20 animate-pulse">
                    <Brain size={36} className="text-primary-600 dark:text-primary-400" strokeWidth={1.5} aria-hidden />
                </div>
                <h2 className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>Aucune analyse de matching</h2>
                <p className={cx("mt-2 text-sm leading-relaxed", RH_TEXT_MUTED)}>
                    Sélectionnez un projet et lancez l&apos;arbitrage workforce piloté par l&apos;IA pour classer les meilleurs
                    talents.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    {["Compétences", "Disponibilité", "Gaps", "Score IA"].map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export type MatchingControlPanelProps = {
    projectId: string;
    projects: RhProjectOption[];
    projectsLoading: boolean;
    projectsError: boolean;
    isRunning: boolean;
    onProjectChange: (id: string) => void;
    onRun: () => void;
    onLoadSaved: () => void;
};

export function MatchingControlPanel({
    projectId,
    projects,
    projectsLoading,
    projectsError,
    isRunning,
    onProjectChange,
    onRun,
    onLoadSaved,
}: MatchingControlPanelProps) {
    return (
        <section className={cx(GLASS, "p-5 md:p-6")}>
            <p className={cx("mb-4 text-[10px] font-bold uppercase tracking-widest", WS_TEXT_FAINT)}>
                Configuration de l&apos;analyse
            </p>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <label className={cx("mb-2 block text-xs font-semibold", RH_TEXT_SECONDARY)}>Projet cible</label>
                    <div className="group relative">
                        <FolderKanban
                            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary-500 transition group-hover:text-primary-600"
                            size={18}
                            aria-hidden
                        />
                        <select
                            value={projectId}
                            onChange={(e) => onProjectChange(e.target.value)}
                            disabled={projectsLoading || isRunning}
                            className={cx(
                                "h-12 w-full appearance-none rounded-xl border border-slate-200/90 bg-white/90 pl-11 pr-10 text-sm font-medium shadow-sm transition",
                                "hover:border-primary-300 hover:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                                "disabled:cursor-not-allowed disabled:opacity-60",
                                "dark:border-slate-600 dark:bg-slate-900/80 dark:hover:border-primary-700",
                                RH_TEXT_PRIMARY,
                            )}
                        >
                            <option value="">— Sélectionner un projet —</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                            aria-hidden
                        />
                    </div>
                    {projectsError ? (
                        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">Impossible de charger les projets.</p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    <button
                        type="button"
                        onClick={onRun}
                        disabled={isRunning || !projectId}
                        className={cx(
                            "relative inline-flex h-12 min-w-[200px] items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-bold text-white shadow-lg transition",
                            "bg-gradient-to-r from-primary-600 via-primary-600 to-primary-600",
                            "hover:from-primary-500 hover:to-primary-500 hover:shadow-primary-500/30",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
                            isRunning && "animate-pulse shadow-primary-500/40",
                        )}
                    >
                        {isRunning ? (
                            <>
                                <Loader2 size={18} className="animate-spin" aria-hidden />
                                Analyse workforce…
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} aria-hidden />
                                Run AI Matching
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onLoadSaved}
                        disabled={!projectId || isRunning}
                        className={cx(
                            "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-5 text-sm font-semibold shadow-sm transition",
                            "hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-600 dark:bg-slate-900/60",
                            RH_TEXT_SECONDARY,
                            "disabled:opacity-50",
                        )}
                    >
                        <Target size={16} aria-hidden />
                        Résultats sauvegardés
                    </button>
                </div>
            </div>
        </section>
    );
}

export function MatchingLoadingPanel({ isRun }: { isRun: boolean }) {
    return (
        <div className={cx(GLASS, "relative overflow-hidden p-12 md:p-16")}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent animate-pulse" />
            <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary-500/30 blur-2xl animate-pulse" />
                    <Loader2 size={48} className="relative animate-spin text-primary-600" aria-hidden />
                </div>
                <p className={cx("text-base font-semibold", RH_TEXT_PRIMARY)}>
                    {isRun ? "Analyse workforce en cours…" : "Chargement des résultats…"}
                </p>
                <p className={cx("mt-2 max-w-lg text-sm", RH_TEXT_MUTED)}>
                    {isRun
                        ? "Corrélation compétences projet, disponibilité, charge et gaps — l’IA construit le classement stratégique."
                        : "Récupération des derniers résultats enregistrés pour ce projet."}
                </p>
                <div className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500" />
                </div>
            </div>
        </div>
    );
}

export function AiInsightsPanel({ narrative, llmEnriched }: { narrative: string; llmEnriched?: boolean }) {
    return (
        <section
            className={cx(
                "relative overflow-hidden rounded-2xl border border-primary-400/30 p-6 md:p-8",
                "bg-gradient-to-br from-primary-500/[0.12] via-orange-500/[0.04] to-primary-500/[0.08]",
                "shadow-[0_0_60px_-12px_rgba(14,147,132,0.35)] dark:from-primary-950/50 dark:via-slate-900 dark:to-primary-950/40",
            )}
        >
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-orange-500 text-white shadow-lg shadow-primary-500/25">
                    <Sparkles size={22} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>AI Strategic Insights</h2>
                        {llmEnriched ? (
                            <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                                LLM enrichi
                            </span>
                        ) : null}
                    </div>
                    <p className={cx("mt-3 text-sm leading-relaxed whitespace-pre-wrap md:text-[15px]", RH_TEXT_SECONDARY)}>
                        {narrative}
                    </p>
                </div>
            </div>
        </section>
    );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "risk" }) {
    const toneCls =
        tone === "ok"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : tone === "risk"
                ? "text-rose-600 dark:text-rose-400"
                : RH_TEXT_SECONDARY;
    return (
        <div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
            <p className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>{label}</p>
            <p className={cx("mt-0.5 text-sm font-bold tabular-nums", toneCls)}>{value}</p>
        </div>
    );
}

export function MatchingTalentCard({ match, rank }: { match: RhMatchingTopMatch; rank: number }) {
    const badge = recommendationBadge(String(match.recommendation_type));
    const loadPct = Math.round(match.current_load_pct);
    const availPct = Math.round(match.available_pct);

    return (
        <article
            className={cx(
                GLASS,
                "group flex flex-col gap-4 p-5 transition duration-300 hover:-translate-y-1 hover:border-primary-300/50 hover:shadow-2xl hover:shadow-primary-500/10",
            )}
        >
            <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white shadow-md">
                        {talentInitials(match.talent_name)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                        {rank}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className={cx("truncate text-base font-bold", RH_TEXT_PRIMARY)}>{match.talent_name}</h3>
                            <p className={cx("truncate text-xs", RH_TEXT_MUTED)}>{match.job_title || "Rôle non renseigné"}</p>
                            {match.email ? (
                                <p className={cx("mt-0.5 truncate text-[11px]", WS_TEXT_FAINT)}>{match.email}</p>
                            ) : null}
                        </div>
                        <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", badge.cls)}>
                            {badge.label}
                        </span>
                    </div>
                </div>
                <ScoreRing score={match.overall_score} />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricPill label="Disponibilité" value={`${availPct}%`} tone={availPct >= 50 ? "ok" : availPct >= 20 ? "warn" : "risk"} />
                <MetricPill label="Charge" value={`${loadPct}%`} tone={loadPct <= 80 ? "ok" : loadPct <= 100 ? "warn" : "risk"} />
                <MetricPill label="Skills match" value={String(match.matched_skills_count)} />
                <MetricPill label="Gaps" value={String(match.gap_count)} tone={match.gap_count === 0 ? "ok" : "warn"} />
            </div>

            <div className="space-y-2">
                <div>
                    <div className="mb-1 flex justify-between text-[10px]">
                        <span className={RH_TEXT_MUTED}>Fit compétences</span>
                        <span className="font-semibold tabular-nums">{match.skill_fit_score.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-500"
                            style={{ width: `${(match.skill_fit_score / 10) * 100}%` }}
                        />
                    </div>
                </div>
                <div>
                    <div className="mb-1 flex justify-between text-[10px]">
                        <span className={RH_TEXT_MUTED}>Score disponibilité</span>
                        <span className="font-semibold tabular-nums">{match.availability_score.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${(match.availability_score / 10) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {match.match_summary ? (
                <p
                    className={cx(
                        "rounded-xl border border-primary-100/80 bg-primary-50/50 p-3 text-xs leading-relaxed dark:border-primary-900/40 dark:bg-primary-950/20",
                        RH_TEXT_SECONDARY,
                    )}
                >
                    {match.match_summary}
                </p>
            ) : null}
        </article>
    );
}

export function MatchingResultsSection({ display }: { display: RhMatchingRunResponse }) {
    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className={cx("text-lg font-bold", RH_TEXT_PRIMARY)}>Talents recommandés</h2>
                    <p className={cx("text-sm", RH_TEXT_MUTED)}>
                        {display.top_matches.length} profil{display.top_matches.length > 1 ? "s" : ""} classé
                        {display.top_matches.length > 1 ? "s" : ""} par score global
                    </p>
                </div>
            </div>

            {display.match_narrative ? (
                <AiInsightsPanel narrative={display.match_narrative} llmEnriched={display.llm_enriched} />
            ) : null}

            {display.top_matches.length === 0 ? (
                <div className={cx(GLASS, "border-dashed p-10 text-center")}>
                    <Users size={32} className="mx-auto text-slate-300" aria-hidden />
                    <p className={cx("mt-3 text-sm font-medium", RH_TEXT_PRIMARY)}>Aucun talent dans le top N</p>
                    <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>Relancez avec d&apos;autres paramètres ou un autre projet.</p>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {display.top_matches.map((match, index) => (
                        <MatchingTalentCard key={`${match.talent_id}-${index}`} match={match} rank={index + 1} />
                    ))}
                </div>
            )}
        </section>
    );
}

export function MatchingErrorBanner({ message }: { message: string }) {
    return (
        <div className={cx("flex items-start gap-3 rounded-2xl p-4", RH_ALERT_ERROR)}>
            <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-sm">{message}</p>
        </div>
    );
}

export function buildHeroKpis(display: RhMatchingRunResponse | null): Parameters<typeof MatchingHeroKpiStrip>[0]["items"] {
    const matches = display?.top_matches ?? [];
    const avgAvail =
        matches.length > 0
            ? Math.round(matches.reduce((s, m) => s + m.available_pct, 0) / matches.length)
            : null;
    const recommended = matches.filter((m) => m.recommendation_type === "recommended").length;
    const avgScore =
        matches.length > 0
            ? matches.reduce((s, m) => s + m.overall_score, 0) / matches.length
            : null;
    const confidence =
        display?.llm_enriched && avgScore != null
            ? `${Math.min(99, Math.round(avgScore * 10 + 5))}%`
            : avgScore != null
              ? `${Math.round(avgScore * 10)}%`
              : "—";

    return [
        {
            label: "Talents évalués",
            value: display ? String(display.summary.candidates_evaluated ?? matches.length) : "—",
            hint: display ? "Pipeline matching" : "En attente d’analyse",
            icon: <Users size={18} aria-hidden />,
            accent: "violet",
        },
        {
            label: "Matches recommandés",
            value: display ? String(display.summary.recommendations_count ?? recommended) : "—",
            hint: display ? `${recommended} profils « recommandés »` : "Lancez une analyse",
            icon: <Target size={18} aria-hidden />,
            accent: "emerald",
        },
        {
            label: "Disponibilité moy.",
            value: avgAvail != null ? `${avgAvail}%` : "—",
            hint: display ? "Sur le top classement" : "—",
            icon: <TrendingUp size={18} aria-hidden />,
            accent: "sky",
        },
        {
            label: "Confiance IA",
            value: confidence,
            hint: display?.llm_enriched ? "Narratif LLM actif" : display ? "Score heuristique" : "—",
            icon: <Zap size={18} aria-hidden />,
            accent: "amber",
        },
    ];
}
