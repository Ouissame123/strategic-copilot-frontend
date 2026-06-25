import type { ReactNode } from "react";
import { RefreshCw01, Stars02 } from "@untitledui/icons";
import { HEALTH_META } from "@/features/manager/lib/dashboard-display";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { MANAGER_DASHBOARD_SECTION_IDS } from "@/features/manager/lib/copilot-engines";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { cx } from "@/utils/cx";

type Props = {
    headline: string;
    health: DashboardResponse["health"];
    agentsActiveCount: number;
    agentsTotal: number;
    computedAt?: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    trailingActions?: ReactNode;
};

export function DashboardHeader({
    headline,
    health,
    agentsActiveCount,
    agentsTotal,
    computedAt,
    onRefresh,
    isRefreshing,
    trailingActions,
}: Props) {
    const meta = HEALTH_META[health.label] ?? HEALTH_META.watch;
    const updatedLabel = computedAt ? formatRelativeShort(computedAt) : null;
    const viability =
        typeof health.avg_viability === "number" && Number.isFinite(health.avg_viability)
            ? health.avg_viability.toFixed(2)
            : "—";

    return (
        <section
            id={MANAGER_DASHBOARD_SECTION_IDS.overview}
            className={cx("scroll-mt-24 rounded-xl border p-4 sm:p-5", meta.sectionBg, meta.border)}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                        <Stars02 className="size-5 text-brand-secondary" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-base font-semibold text-primary">Copilot — Synthèse du jour</h1>
                            <span className="rounded-full border border-brand-secondary/30 bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                                {agentsActiveCount}/{agentsTotal} agents
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-secondary">{headline}</p>
                        <p className="mt-1.5 text-xs text-tertiary">
                            Viabilité portefeuille {viability}/10
                            {updatedLabel ? ` · MAJ ${updatedLabel}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                    <div className="text-right">
                        <div className={cx("text-3xl font-bold tabular-nums leading-none", meta.scoreText)}>
                            {health.score.toFixed(2)}
                        </div>
                        <div className="mt-1 text-xs text-tertiary">/ 10 · {meta.label}</div>
                    </div>
                    {trailingActions}
                    {onRefresh ? (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center justify-center rounded-lg border border-secondary bg-primary p-2 text-secondary transition hover:bg-secondary_subtle disabled:opacity-50"
                            aria-label="Actualiser le dashboard"
                        >
                            <RefreshCw01 className={cx("size-4", isRefreshing && "animate-spin")} aria-hidden />
                        </button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
