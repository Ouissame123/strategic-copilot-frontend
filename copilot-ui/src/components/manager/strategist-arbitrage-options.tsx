import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Clock, Loader2, Octagon, Plus, Repeat, X } from "lucide-react";
import { dedupeArbitrageOptions, resolveArbitrageOptionType } from "@/lib/strategist-arbitrage";
import type { ArbitrageImpactJson, ArbitrageOption, ArbitrageOptionType } from "@/types/api.types";
import { cx } from "@/utils/cx";

type OptionConfig = {
    label: string;
    description: string;
    icon: typeof Repeat;
    color: string;
    bg: string;
    border: string;
};

const OPTION_CONFIG: Record<ArbitrageOptionType, OptionConfig> = {
    reallocation: {
        label: "Réallocation",
        description: "Déplacer un talent vers un autre projet pour équilibrer la charge",
        icon: Repeat,
        color: "text-indigo-700 dark:text-indigo-300",
        bg: "bg-indigo-50 dark:bg-indigo-950/40",
        border: "border-indigo-200 dark:border-indigo-800/60",
    },
    delay: {
        label: "Report",
        description: "Décaler les échéances projet pour réduire la pression",
        icon: Clock,
        color: "text-amber-700 dark:text-amber-300",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-amber-200 dark:border-amber-800/60",
    },
    reinforce: {
        label: "Renforcer",
        description: "Ajouter des ressources (pool interne ou recrutement)",
        icon: Plus,
        color: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-800/60",
    },
    stop_scope: {
        label: "Stop / Scope",
        description: "Mettre en pause ou réduire le périmètre",
        icon: Octagon,
        color: "text-rose-700 dark:text-rose-300",
        bg: "bg-rose-50 dark:bg-rose-950/40",
        border: "border-rose-200 dark:border-rose-800/60",
    },
};

function hasImpactMetrics(impact: ArbitrageImpactJson | null | undefined): boolean {
    if (!impact) return false;
    return (
        impact.score_delta != null ||
        impact.capacity_delta != null ||
        impact.alerts_impact != null ||
        impact.timeline_days != null ||
        (impact.budget_impact != null && impact.budget_impact !== 0)
    );
}

function isTerminalArbitrageStatus(status: string | undefined): boolean {
    return status === "executed" || status === "rejected";
}

export type StrategistArbitrageOptionsProps = {
    options: ArbitrageOption[];
    loading?: boolean;
    proposeLoading?: boolean;
    onAccept: (option: ArbitrageOption) => Promise<void>;
    onReject: (option: ArbitrageOption) => Promise<void>;
    onPropose: () => Promise<void>;
};

export function StrategistArbitrageOptions({
    options,
    loading = false,
    proposeLoading = false,
    onAccept,
    onReject,
    onPropose,
}: StrategistArbitrageOptionsProps) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.${key}`, opts as never) : t(`managerWorkspace.missionControl.${key}`));

    const [actingId, setActingId] = useState<string | null>(null);

    const displayOptions = useMemo(() => dedupeArbitrageOptions(options), [options]);

    const handleAccept = async (opt: ArbitrageOption) => {
        setActingId(opt.id);
        try {
            await onAccept(opt);
        } finally {
            setActingId(null);
        }
    };

    const handleReject = async (opt: ArbitrageOption) => {
        setActingId(opt.id);
        try {
            await onReject(opt);
        } finally {
            setActingId(null);
        }
    };

    const handlePropose = () => {
        void onPropose();
    };

    if (proposeLoading && displayOptions.length === 0) {
        return (
            <section className="rounded-xl border border-secondary bg-primary p-5 shadow-sm">
                <header className="mb-3">
                    <h3 className="text-sm font-semibold text-fg-primary">{tm("arbitrageOptionsTitle")}</h3>
                    <p className="mt-1 text-xs text-fg-tertiary">{tm("arbitrageStrategistHint")}</p>
                </header>
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-fg-tertiary">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {tm("arbitrageRecalculating")}
                </div>
            </section>
        );
    }

    if (!loading && displayOptions.length === 0) {
        return (
            <section className="rounded-xl border border-secondary bg-primary p-5 shadow-sm">
                <header className="mb-3">
                    <h3 className="text-sm font-semibold text-fg-primary">{tm("arbitrageOptionsTitle")}</h3>
                    <p className="mt-1 text-xs text-fg-tertiary">{tm("arbitrageStrategistHint")}</p>
                </header>
                <div className="py-6 text-center">
                    <AlertCircle className="mx-auto mb-2 size-8 text-tertiary/50" aria-hidden />
                    <p className="mb-4 text-sm text-fg-secondary">{tm("arbitrageEmpty")}</p>
                    <button
                        type="button"
                        onClick={handlePropose}
                        disabled={proposeLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {proposeLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Repeat className="size-4" aria-hidden />}
                        {tm("arbitrageRequestStrategist")}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-fg-primary">{tm("arbitrageOptionsTitle")}</h3>
                    <p className="mt-1 text-xs text-fg-tertiary">
                        {tm("arbitrageOptionsCount", { count: displayOptions.length })}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handlePropose}
                    disabled={proposeLoading}
                    className="rounded-lg border border-secondary bg-primary px-3 py-1.5 text-xs font-semibold text-fg-secondary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {proposeLoading ? tm("arbitrageRecalculating") : tm("arbitrageRecalculate")}
                </button>
            </header>

            {loading || proposeLoading ? (
                <p className="mb-2 flex items-center gap-2 text-sm text-fg-tertiary">
                    {proposeLoading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                    {proposeLoading ? tm("arbitrageRecalculating") : tm("loadingShort")}
                </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {displayOptions.map((opt) => {
                    const type = resolveArbitrageOptionType(opt);
                    const cfg = OPTION_CONFIG[type];
                    const Icon = cfg.icon;
                    const status = opt.status ?? "proposed";
                    const isTerminal = isTerminalArbitrageStatus(status);
                    const isActing = actingId === opt.id;
                    const impact = opt.impact_json;
                    const confidencePct = Math.round((opt.confidence ?? 0) * 100);

                    return (
                        <article
                            key={opt.id}
                            className={cx(
                                "flex flex-col rounded-xl border p-3 transition",
                                cfg.border,
                                cfg.bg,
                                isTerminal && "opacity-60 saturate-50",
                            )}
                        >
                            <header className="mb-2 flex items-start gap-2">
                                <span
                                    className={cx(
                                        "flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                                        cfg.bg,
                                        cfg.border,
                                    )}
                                >
                                    <Icon className={cx("size-4", cfg.color)} aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className={cx("text-sm font-semibold", cfg.color)}>{opt.label || cfg.label}</h4>
                                        <span className="rounded bg-primary/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-fg-secondary">
                                            {confidencePct}%
                                        </span>
                                        {status === "executed" ? (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                                                {tm("arbitrageStatusExecuted")}
                                            </span>
                                        ) : null}
                                        {status === "rejected" ? (
                                            <span className="rounded-full bg-secondary_subtle px-2 py-0.5 text-[10px] font-semibold text-fg-tertiary">
                                                {tm("arbitrageStatusRejected")}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-[11px] text-fg-tertiary">{cfg.description}</p>
                                </div>
                            </header>

                            <p className="mb-2 flex-1 text-sm leading-snug text-fg-secondary">{opt.rationale}</p>

                            {hasImpactMetrics(impact) ? (
                                <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
                                    {impact?.score_delta != null ? (
                                        <span
                                            className={cx(
                                                "rounded px-1.5 py-0.5 font-medium",
                                                impact.score_delta > 0
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
                                            )}
                                        >
                                            {tm("arbitrageImpactScore", {
                                                delta: `${impact.score_delta > 0 ? "+" : ""}${impact.score_delta.toFixed(1)}`,
                                            })}
                                        </span>
                                    ) : null}
                                    {impact?.capacity_delta != null ? (
                                        <span className="rounded bg-secondary_subtle px-1.5 py-0.5 font-medium text-fg-secondary">
                                            {tm("arbitrageImpactCapacity", {
                                                delta: `${impact.capacity_delta > 0 ? "+" : ""}${impact.capacity_delta}%`,
                                            })}
                                        </span>
                                    ) : null}
                                    {impact?.alerts_impact != null && impact.alerts_impact !== 0 ? (
                                        <span
                                            className={cx(
                                                "rounded px-1.5 py-0.5 font-medium",
                                                impact.alerts_impact < 0
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
                                            )}
                                        >
                                            {tm("arbitrageImpactAlerts", {
                                                delta: `${impact.alerts_impact > 0 ? "+" : ""}${impact.alerts_impact}`,
                                            })}
                                        </span>
                                    ) : null}
                                    {impact?.timeline_days != null ? (
                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                            {tm("arbitrageImpactTimeline", { days: impact.timeline_days })}
                                        </span>
                                    ) : null}
                                    {impact?.budget_impact != null && impact.budget_impact !== 0 ? (
                                        <span className="rounded bg-secondary_subtle px-1.5 py-0.5 font-medium text-fg-secondary">
                                            {tm("arbitrageImpactBudget", {
                                                delta: `${impact.budget_impact > 0 ? "+" : ""}${impact.budget_impact}€`,
                                            })}
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}

                            <footer className="flex items-center gap-1.5 border-t border-secondary/50 pt-2">
                                <button
                                    type="button"
                                    onClick={() => void handleAccept(opt)}
                                    disabled={isActing || isTerminal}
                                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-solid px-2 py-1.5 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isActing ? (
                                        <Loader2 className="size-3 animate-spin" aria-hidden />
                                    ) : (
                                        <CheckCircle2 className="size-3" aria-hidden />
                                    )}
                                    {tm("arbitrageAccept")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleReject(opt)}
                                    disabled={isActing || isTerminal}
                                    className="rounded-lg border border-secondary bg-primary px-2 py-1.5 text-fg-secondary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                                    title={tm("rejectOption")}
                                    aria-label={tm("rejectOption")}
                                >
                                    <X className="size-3" aria-hidden />
                                </button>
                            </footer>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
