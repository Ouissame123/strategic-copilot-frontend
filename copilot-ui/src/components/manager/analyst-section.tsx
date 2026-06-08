import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardAnalyst, DashboardAnalystAtRiskTalent, DashboardAnalystIpiTopPerformer } from "@/types/api.types";
import { NineBoxInteractive } from "@/components/manager/dashboard/NineBoxInteractive";
import {
    buildNineBoxGridFromAnalyst,
    NINE_BOX_BACKEND_I18N_KEYS,
    type NineBoxBackendLabel,
} from "@/lib/nine-box-dashboard";
import { useManagerAnalystDashboard } from "@/hooks/use-manager-analyst";
import { useAuth } from "@/providers/auth-provider";

function readAnalystNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function formatAnalystStatDisplay(n: number | null): string {
    if (n === null) return "—";
    return String(Math.round(n));
}

function formatAnalystIpi(n: number | null): string {
    if (n === null) return "—";
    return n.toFixed(1);
}

function formatMobilityScore(n: number | null): string {
    if (n === null) return "—";
    return n.toFixed(1);
}

function hasAnalystContent(analyst: DashboardAnalyst | undefined): boolean {
    if (!analyst) return false;
    const s = analyst.stats;
    if (s) {
        const keys: (keyof typeof s)[] = [
            "team_size",
            "ipi_avg",
            "stable_count",
            "at_risk_count",
            "stars_count",
            "critical_box_count",
        ];
        if (keys.some((k) => readAnalystNumber(s[k]) !== null)) return true;
    }
    if ((analyst.ipi_top_performers ?? []).length > 0) return true;
    if ((analyst.at_risk_talents ?? []).length > 0) return true;
    const rawDist = analyst.nine_box_distribution;
    if (Array.isArray(rawDist) && rawDist.length > 0) return true;
    if (rawDist != null && typeof rawDist === "object" && !Array.isArray(rawDist) && Object.keys(rawDist).length > 0) {
        return true;
    }
    if (analyst.nine_box_matrix != null && analyst.nine_box_matrix !== "") return true;
    return false;
}

function AnalystMiniKpiCard({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-xl border border-secondary/90 bg-primary px-4 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
        </article>
    );
}

function analystBadgeClassName(): string {
    return "shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary";
}

/** Liste scrollable dans une card à hauteur fixe — scrollbar fine et discrète. */
const ANALYST_CARD_LIST_SCROLL_CLASS =
    "min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.5)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/60 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/60 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500/70";

function formatFlagDisplay(raw: string): string {
    if (!raw.trim()) return "—";
    return raw
        .replace(/_/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function readAtRiskDrivers(row: DashboardAnalystAtRiskTalent): string[] {
    const raw =
        row.mobility_drivers ??
        row.drivers ??
        row.risk_drivers ??
        (row as Record<string, unknown>).mobilityDrivers ??
        (row as Record<string, unknown>).riskDrivers;
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 2);
}

function AnalystBlockShell({
    title,
    children,
    bodyClassName = "flex min-h-0 flex-1 flex-col p-4",
}: {
    title: string;
    children: React.ReactNode;
    bodyClassName?: string;
}) {
    const { t } = useTranslation("common");
    return (
        <article className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="shrink-0 border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className={analystBadgeClassName()}>{t("managerWorkspace.dashboard.analystBadge")}</span>
                </div>
            </div>
            <div className={bodyClassName}>{children}</div>
        </article>
    );
}

function EmptyBlock() {
    const { t } = useTranslation("common");
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
            <p className="max-w-xs text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.analystEmpty")}</p>
        </div>
    );
}

function AnalystSectionSkeleton() {
    return (
        <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Chargement Agent Analyst">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[72px] rounded-xl bg-secondary_subtle/80 dark:bg-secondary_subtle/30" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[520px] rounded-2xl bg-secondary_subtle/60 dark:bg-secondary_subtle/25" />
                ))}
            </div>
        </div>
    );
}

export function AnalystSection() {
    const { t } = useTranslation("common");
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId;
    const managerId = user?.id;
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { analyst, isLoading, isError, isReady, errorMessage, refetchAll, hasContext } = useManagerAnalystDashboard(
        enterpriseId,
        managerId,
    );

    const stats = analyst?.stats;
    const topPerformers = analyst?.ipi_top_performers ?? [];
    const atRiskTalents = analyst?.at_risk_talents ?? [];
    const nineBoxGrid = useMemo(
        () =>
            buildNineBoxGridFromAnalyst(
                analyst,
                (backendLabel: NineBoxBackendLabel) =>
                    t(`managerWorkspace.dashboard.${NINE_BOX_BACKEND_I18N_KEYS[backendLabel]}`),
                (i) => t("managerWorkspace.dashboard.analystNineBoxZoneFallback", { index: i }),
            ),
        [analyst, t],
    );

    const showEmpty = isReady && !hasAnalystContent(analyst);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchAll();
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <section className="space-y-5 rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-primary">{t("managerWorkspace.dashboard.analystTitle")}</h3>
                        <span className="rounded-full border border-brand-secondary/40 bg-brand-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-brand-secondary">
                            {t("managerWorkspace.dashboard.analystBadge")}
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-secondary">{t("managerWorkspace.dashboard.analystSubtitle")}</p>
                </div>
                <button
                    type="button"
                    className="shrink-0 self-start rounded-lg border border-secondary bg-primary_alt px-2.5 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                    disabled={!hasContext || isLoading || isRefreshing}
                    onClick={() => {
                        void handleRefresh();
                    }}
                >
                    {t("managerWorkspace.dashboard.refresh")}
                </button>
            </div>

            {!hasContext ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.analystEmpty")}</p>
                </div>
            ) : isLoading ? (
                <AnalystSectionSkeleton />
            ) : isError ? (
                <div
                    role="alert"
                    className="rounded-xl border border-error-secondary/40 bg-error-primary/10 px-4 py-6 text-center text-sm text-error-primary"
                >
                    {errorMessage?.trim() || "Impossible de charger les données Analyst."}
                </div>
            ) : showEmpty ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.analystEmpty")}</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiTeam")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.team_size))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiIpiAvg")}
                            value={formatAnalystIpi(readAnalystNumber(stats?.ipi_avg))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiStables")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.stable_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiAtRisk")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.at_risk_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiStars")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.stars_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiCriticalBoxes")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.critical_box_count))}
                        />
                    </div>

                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                        <AnalystBlockShell title={t("managerWorkspace.dashboard.analystBlockTopPerformers")}>
                            {topPerformers.length === 0 ? (
                                <EmptyBlock />
                            ) : (
                                <ul className={`${ANALYST_CARD_LIST_SCROLL_CLASS} flex flex-col gap-3`}>
                                    {topPerformers.map((row: DashboardAnalystIpiTopPerformer, i: number) => {
                                        const name = row.talent_name?.trim() || "—";
                                        const ipi = readAnalystNumber(row.ipi_score);
                                        const band = row.band?.trim().toLowerCase() ?? "";
                                        const pct = ipi != null ? Math.min(100, Math.max(0, (ipi / 10) * 100)) : 0;
                                        return (
                                            <li
                                                key={`${name}-${i}`}
                                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-violet-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-tertiary">
                                                        {i + 1}.
                                                    </span>
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <p className="text-sm font-semibold leading-snug text-primary">{name}</p>
                                                        <p className="text-xs leading-relaxed text-secondary">
                                                            {t("managerWorkspace.dashboard.analystIpiLine", {
                                                                ipi: formatAnalystIpi(ipi),
                                                                band: band || "—",
                                                            })}
                                                        </p>
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary_subtle/80 dark:bg-secondary_subtle/40">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-secondary"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </AnalystBlockShell>

                        <AnalystBlockShell title={t("managerWorkspace.dashboard.analystBlockAtRisk")}>
                            {atRiskTalents.length === 0 ? (
                                <EmptyBlock />
                            ) : (
                                <ul className={`${ANALYST_CARD_LIST_SCROLL_CLASS} flex flex-col gap-3`}>
                                    {atRiskTalents.map((row: DashboardAnalystAtRiskTalent, i: number) => {
                                        const name = row.talent_name?.trim() || "—";
                                        const flagRaw = row.mobility_flag?.trim() ?? "";
                                        const score = readAnalystNumber(row.mobility_score);
                                        const drivers = readAtRiskDrivers(row);
                                        return (
                                            <li
                                                key={`${name}-${i}`}
                                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-amber-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                                            >
                                                <p className="text-sm font-semibold leading-snug text-primary">{name}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {flagRaw ? (
                                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                                                            {formatFlagDisplay(flagRaw)}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-xs text-secondary">
                                                        {t("managerWorkspace.dashboard.analystAtRiskScoreLine", {
                                                            score: formatMobilityScore(score),
                                                        })}
                                                    </span>
                                                </div>
                                                {drivers.length > 0 ? (
                                                    <ul className="mt-2 space-y-0.5 border-t border-secondary/50 pt-2 text-[11px] text-tertiary">
                                                        {drivers.map((d) => (
                                                            <li key={d} className="leading-snug">
                                                                · {d}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </AnalystBlockShell>

                        <AnalystBlockShell
                            title={t("managerWorkspace.dashboard.analystBlockNineBox")}
                            bodyClassName="flex min-h-0 flex-1 flex-col items-center justify-center p-4"
                        >
                            {nineBoxGrid == null ? (
                                <EmptyBlock />
                            ) : (
                                <div className="flex min-h-0 w-full max-w-[min(100%,22rem)] flex-1 items-center justify-center">
                                    <NineBoxInteractive
                                        grid={nineBoxGrid}
                                        nineBoxMatrix={analyst?.nine_box_matrix}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </AnalystBlockShell>
                    </div>
                </>
            )}
        </section>
    );
}
