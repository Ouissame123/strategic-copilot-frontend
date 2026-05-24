import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { isAxiosError } from "axios";
import { AlertCircle, Download, Search, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { Button } from "@/components/base/buttons/button";
import {
    ConfidenceHeatmap,
    DateGroupHeader,
    DecisionKPI,
    DecisionRow,
    DecisionStackedBar,
    DecisionWatchCard,
    ReasonChip,
} from "@/components/decision-log";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import {
    applyDecisionStatusInManagerLogCache,
    removeDecisionFromManagerLogCache,
    useManagerDecisionLog,
} from "@/hooks/useManagerDecisionLog";
import { useToast } from "@/providers/toast-provider";
import { decisionsApi, type DecisionLogStatus, type DecisionStatusAction } from "@/services/decisions.api";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/providers/auth-provider";
import {
    bucketByDate,
    computePrevWeekDelta,
    computeSparkline,
    computeWatchCount,
    confidencePercent,
    DATE_BUCKET_LABELS,
    DATE_BUCKET_ORDER,
    exportToCsv,
    isDecisionVisibleInLog,
    kpiAvgConfidencePercent,
    lowestScoreDecision,
    normalizeDecisionKind,
} from "@/utils/decisionLogHelpers";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";
function MiniSparkline({ values }: { values: number[] }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex h-8 items-end gap-0.5" aria-hidden>
            {values.map((v, i) => (
                <div key={i} className="w-1.5 rounded-t bg-violet-500/80" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
            ))}
        </div>
    );
}

export default function ManagerDecisionLogPage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const { user } = useAuth();
    const enterpriseId = (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();

    const queryClient = useQueryClient();
    const { push } = useToast();
    const { data, isLoading, isError } = useManagerDecisionLog(enterpriseId || undefined, { limit: 100 });
    const { data: projectsData } = useProjects({ limit: 100 });

    const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);
    const [statusUpdatingDecisionId, setStatusUpdatingDecisionId] = useState<string | null>(null);
    const [filterDecision, setFilterDecision] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [filterPeriod, setFilterPeriod] = useState<"all" | "7d" | "30d" | "90d">("30d");
    const [reasonFilter, setReasonFilter] = useState<string | null>(null);
    const [projectFilterTop, setProjectFilterTop] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 200);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    const decisions = useMemo(() => (data?.decisions ?? []).filter(isDecisionVisibleInLog), [data?.decisions]);
    const kpis = data?.kpis;
    const reasonsTop = data?.reasons_top ?? [];
    const projectsTop = data?.projects_top ?? [];
    const heatmap = data?.heatmap ?? {};
    const projects = projectsData?.items ?? [];

    const periodFiltered = useMemo(() => {
        if (filterPeriod === "all") return decisions;
        const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
        const cut = Date.now() - days * 86_400_000;
        return decisions.filter((d) => new Date(d.created_at).getTime() >= cut);
    }, [decisions, filterPeriod]);

    const filteredDecisions = useMemo(() => {
        let list = periodFiltered;
        const projectId = projectFilterTop ?? (filterProject !== "all" ? filterProject : null);
        if (projectId) list = list.filter((d) => d.project_id === projectId);
        if (filterDecision !== "all") {
            list = list.filter((d) => normalizeDecisionKind(d.decision) === filterDecision);
        }
        if (reasonFilter) list = list.filter((d) => d.reason_code === reasonFilter);
        if (debouncedSearch) {
            list = list.filter((d) => {
                const hay = `${d.project_name} ${d.reason_code} ${d.synthesis}`.toLowerCase();
                return hay.includes(debouncedSearch);
            });
        }
        return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [periodFiltered, filterProject, projectFilterTop, filterDecision, reasonFilter, debouncedSearch]);

    const sparkline = useMemo(() => computeSparkline(periodFiltered, 14), [periodFiltered]);
    const confDelta = useMemo(() => computePrevWeekDelta(periodFiltered, "confidence"), [periodFiltered]);
    const watchCount = useMemo(() => computeWatchCount(periodFiltered), [periodFiltered]);

    const watchDecision = useMemo(() => lowestScoreDecision(periodFiltered), [periodFiltered]);

    const confidenceTrend = useMemo(() => {
        const sorted = [...periodFiltered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return sorted.slice(-28).map((d, idx) => ({
            idx: idx + 1,
            label: new Date(d.created_at).toLocaleDateString(localeForDateFormatting(i18n.language), { month: "short", day: "numeric" }),
            conf: confidencePercent(d.confidence),
        }));
    }, [periodFiltered]);

    const grouped = useMemo(() => bucketByDate(filteredDecisions), [filteredDecisions]);
    const avgConfidencePct = useMemo(() => (kpis ? kpiAvgConfidencePercent(kpis) : 0), [kpis]);

    const filtersActive =
        filterDecision !== "all" ||
        filterProject !== "all" ||
        filterPeriod !== "30d" ||
        reasonFilter != null ||
        projectFilterTop != null ||
        debouncedSearch.length > 0;

    const resetFilters = useCallback(() => {
        setFilterDecision("all");
        setFilterProject("all");
        setFilterPeriod("30d");
        setReasonFilter(null);
        setProjectFilterTop(null);
        setSearchInput("");
    }, []);

    const openProjectModal = useCallback(
        (projectId: string | null | undefined) => {
            const pid = projectId?.trim();
            if (!pid) return;
            navigate(managerProjectsOpenModalPath(pid));
        },
        [navigate],
    );

    const onExportCsv = useCallback(() => {
        if (!filteredDecisions.length) return;
        exportToCsv(filteredDecisions, `decisions_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [filteredDecisions]);

    const updateDecisionStatus = useCallback(
        async (decisionId: string, action: DecisionStatusAction) => {
            if (!enterpriseId) {
                push("Identifiant entreprise manquant", "error");
                return;
            }

            setStatusUpdatingDecisionId(decisionId);
            try {
                const res = await decisionsApi.markManagerDecisionHandled(enterpriseId, decisionId, action);
                if (res?.success) {
                    const status: DecisionLogStatus =
                        res.status ??
                        (action === "handled" ? "handled" : action === "dismissed" ? "dismissed" : "open");
                    applyDecisionStatusInManagerLogCache(queryClient, enterpriseId, decisionId, status, 100);
                    if (action === "handled") {
                        push("Décision marquée comme traitée", "success");
                    } else if (action === "dismissed") {
                        push("Décision masquée", "success");
                    } else {
                        push("Décision réouverte", "success");
                    }
                } else {
                    push(res?.message ?? "Erreur de mise à jour", "error");
                }
            } catch (err) {
                const msg = isAxiosError(err)
                    ? String((err.response?.data as { message?: string })?.message ?? err.message)
                    : null;
                push(msg || "Erreur de mise à jour", "error");
            } finally {
                setStatusUpdatingDecisionId(null);
            }
        },
        [enterpriseId, push, queryClient],
    );

    const handleDeleteDecision = useCallback(
        async (decisionId: string) => {
            if (!enterpriseId) {
                push("Identifiant entreprise manquant", "error");
                return;
            }
            if (!window.confirm("Supprimer cette décision ?")) return;

            setDeletingDecisionId(decisionId);
            try {
                const res = await decisionsApi.deleteManagerDecision(enterpriseId, decisionId, "soft");
                if (res?.success) {
                    removeDecisionFromManagerLogCache(queryClient, enterpriseId, decisionId, 100);
                    push("Décision supprimée", "success");
                } else {
                    push(res?.message ?? "Erreur lors de la suppression", "error");
                }
            } catch (err) {
                const msg = isAxiosError(err)
                    ? String((err.response?.data as { message?: string })?.message ?? err.message)
                    : null;
                push(msg || "Erreur lors de la suppression", "error");
            } finally {
                setDeletingDecisionId(null);
            }
        },
        [enterpriseId, push, queryClient],
    );

    const topbarTrailing = useMemo(
        (): ReactNode => (
            <Button type="button" color="secondary" size="sm" onClick={onExportCsv} isDisabled={!filteredDecisions.length}>
                {t("managerWorkspace.decisionLogPage.exportCsv")}
            </Button>
        ),
        [filteredDecisions.length, onExportCsv, t],
    );

    useWorkspaceTopbarMeta(t("managerWorkspace.decisionLogPage.heroTitle"), t("managerWorkspace.decisionLogPage.heroSubtitle"), topbarTrailing);

    if (!isLoading && !isError && (kpis?.total ?? 0) === 0) {
        return (
            <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={t("managerWorkspace.decisionLogPage.shellTitle")} description={false} omitHeader>
                <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-secondary px-6 py-16 text-center">
                    <AlertCircle className="size-10 text-tertiary" aria-hidden />
                    <p className="mt-4 max-w-md text-sm text-secondary">Les décisions sont générées par le Copilot IA après analyse</p>
                </div>
            </WorkspacePageShell>
        );
    }

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={t("managerWorkspace.decisionLogPage.shellTitle")} description={false} omitHeader>
            <div className="space-y-4 pb-6">
                {isLoading ? <p className="text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.loading")}</p> : null}
                {isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                        {t("managerWorkspace.decisionLogPage.loadError")}
                    </div>
                ) : null}

                {!isLoading && !isError && kpis ? (
                    <>
                        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <DecisionKPI
                                label="Décisions 30j"
                                footer={<MiniSparkline values={sparkline} />}
                            >
                                <p className="text-2xl font-bold tabular-nums text-primary">{kpis.total}</p>
                            </DecisionKPI>
                            <DecisionKPI label="Confiance moyenne">
                                <p className="text-2xl font-bold tabular-nums text-primary">
                                    {avgConfidencePct}
                                    <span className="text-base font-medium text-tertiary">%</span>
                                </p>
                                {confDelta != null ? (
                                    <p className={cx("mt-1 flex items-center gap-1 text-xs font-medium", confDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                        <TrendingUp className={cx("size-3.5", confDelta < 0 && "rotate-180")} />
                                        {confDelta >= 0 ? "+" : ""}
                                        {confDelta} pts vs semaine précédente
                                    </p>
                                ) : null}
                            </DecisionKPI>
                            <DecisionKPI label="Score moyen">
                                <p className="text-2xl font-bold tabular-nums text-primary">{Number(kpis.avg_score).toFixed(1)}</p>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary_subtle">
                                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (Number(kpis.avg_score) / 10) * 100)}%` }} />
                                </div>
                                <p className="mt-1 text-[10px] text-tertiary">/ 10</p>
                            </DecisionKPI>
                            <DecisionKPI label="À surveiller">
                                <p className="text-2xl font-bold tabular-nums text-amber-600">{watchCount}</p>
                                <p className="mt-1 text-xs text-tertiary">score &lt; 5 ou confiance &lt; 50 %</p>
                            </DecisionKPI>
                        </section>

                        <DecisionStackedBar kpis={kpis} />

                        <section className="sticky top-0 z-30 rounded-xl border border-secondary/90 bg-primary/90 px-3 py-2.5 shadow-sm backdrop-blur-md md:px-4">
                            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
                                <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.filterProjectLabel")}</span>
                                    <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setProjectFilterTop(null); }} className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm">
                                        <option value="all">{t("managerWorkspace.decisionLogPage.filterProjectAll")}</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.filterDecisionLabel")}</span>
                                    <select value={filterDecision} onChange={(e) => setFilterDecision(e.target.value)} className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm">
                                        <option value="all">{t("managerWorkspace.decisionLogPage.filterDecisionAll")}</option>
                                        <option value="continue">Continue</option>
                                        <option value="adjust">Adjust</option>
                                        <option value="stop">Stop</option>
                                        <option value="other">Other</option>
                                    </select>
                                </label>
                                <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.filterPeriodLabel")}</span>
                                    <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as typeof filterPeriod)} className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm">
                                        <option value="all">{t("managerWorkspace.decisionLogPage.periodAll")}</option>
                                        <option value="7d">{t("managerWorkspace.decisionLogPage.period7d")}</option>
                                        <option value="30d">{t("managerWorkspace.decisionLogPage.period30d")}</option>
                                        <option value="90d">{t("managerWorkspace.decisionLogPage.period90d")}</option>
                                    </select>
                                </label>
                                {filtersActive ? (
                                    <Button type="button" color="secondary" size="sm" onClick={resetFilters}>
                                        {t("managerWorkspace.decisionLogPage.resetFilters")}
                                    </Button>
                                ) : null}
                            </div>
                            {reasonsTop.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-secondary/60 pt-2">
                                    {reasonsTop.map((r) => (
                                        <ReasonChip
                                            key={r.code}
                                            code={r.code}
                                            label={r.label || r.code}
                                            count={r.count}
                                            active={reasonFilter === r.code}
                                            onClick={() => setReasonFilter((prev) => (prev === r.code ? null : r.code))}
                                            onClear={() => setReasonFilter(null)}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </section>

                        {watchDecision ? (
                            <DecisionWatchCard
                                decision={watchDecision}
                                onViewProject={() => openProjectModal(watchDecision.project_id)}
                                onUpdateStatus={(action) => void updateDecisionStatus(watchDecision.decision_id, action)}
                                statusUpdating={statusUpdatingDecisionId === watchDecision.decision_id}
                            />
                        ) : null}

                        <article className="rounded-xl border border-secondary bg-primary p-3 shadow-sm md:p-4 lg:max-w-md">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsProjects")}</h3>
                            <ul className="mt-2 divide-y divide-secondary/60">
                                {projectsTop.length ? projectsTop.map((p) => (
                                    <li key={p.project_id}>
                                        <button type="button" onClick={() => { setProjectFilterTop(p.project_id); setFilterProject("all"); }} className={cx("flex w-full items-center justify-between gap-2 py-2 text-left text-sm transition", projectFilterTop === p.project_id ? "font-semibold text-brand-secondary" : "text-primary hover:text-brand-secondary")}>
                                            <span className="truncate">{p.name}</span>
                                            <span className="flex shrink-0 items-center gap-1 tabular-nums text-tertiary">{p.count} ›</span>
                                        </button>
                                    </li>
                                )) : <li className="py-1.5 text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsProjectsEmpty")}</li>}
                            </ul>
                        </article>

                        <div className="grid gap-3 lg:grid-cols-2">
                            <article className="rounded-xl border border-secondary bg-primary p-3 shadow-sm md:p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.chartTrendTitle")}</h3>
                                <div className="mt-2 h-40 w-full min-w-0">
                                    {confidenceTrend.length > 1 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={confidenceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-secondary/60" />
                                                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                                                <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                                <Line type="monotone" dataKey="conf" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.chartTrendEmpty")}</div>
                                    )}
                                </div>
                            </article>
                            <ConfidenceHeatmap heatmap={heatmap} />
                        </div>

                        <section className="rounded-xl border border-secondary bg-primary p-3 shadow-sm md:p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-sm font-semibold text-primary">{t("managerWorkspace.decisionLogPage.tableTitle")}</h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="relative flex min-w-[12rem] flex-1 items-center">
                                        <Search className="pointer-events-none absolute left-2.5 size-4 text-tertiary" aria-hidden />
                                        <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Rechercher projet, motif, synthèse…" className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm" />
                                    </label>
                                    <Button type="button" color="secondary" size="sm" onClick={onExportCsv} isDisabled={!filteredDecisions.length}>
                                        <Download className="size-4" />
                                        Exporter CSV
                                    </Button>
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-tertiary">{filteredDecisions.length} résultat{filteredDecisions.length !== 1 ? "s" : ""}</p>
                            {filtersActive ? (
                                <button type="button" className="mt-1 text-xs font-semibold text-brand-secondary hover:underline" onClick={resetFilters}>
                                    Réinitialiser
                                </button>
                            ) : null}

                            {filteredDecisions.length === 0 ? (
                                <div className="mt-4 flex flex-col items-center py-6 text-center">
                                    <Search className="size-8 text-tertiary" aria-hidden />
                                    <p className="mt-3 text-sm text-secondary">Aucune décision ne correspond à vos filtres</p>
                                    <Button type="button" color="primary" size="sm" className="mt-4" onClick={resetFilters}>
                                        {t("managerWorkspace.decisionLogPage.resetFilters")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {DATE_BUCKET_ORDER.map((key) => {
                                        const rows = grouped[key];
                                        if (!rows.length) return null;
                                        return (
                                            <div key={key} className="space-y-2">
                                                <DateGroupHeader label={DATE_BUCKET_LABELS[key]} count={rows.length} />
                                                {rows.map((d) => (
                                                    <DecisionRow
                                                        key={d.decision_id}
                                                        decision={d}
                                                        onOpenProject={() => openProjectModal(d.project_id)}
                                                        onUpdateStatus={(action) => void updateDecisionStatus(d.decision_id, action)}
                                                        statusUpdating={statusUpdatingDecisionId === d.decision_id}
                                                        onDelete={() => void handleDeleteDecision(d.decision_id)}
                                                        deleting={deletingDecisionId === d.decision_id}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                ) : null}
            </div>

        </WorkspacePageShell>
    );
}
