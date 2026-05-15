import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRight } from "@untitledui/icons";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useDecisions } from "@/hooks/useDecisions";
import { useProjects } from "@/hooks/useProjects";
import { formatUserFacingExplanation, stripTechnicalScoringSegments } from "@/lib/business-explanation";
import type { CopilotDecision } from "@/services/decisions.api";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const MANAGER_RH_REQUESTS_PATH = "/workspace/manager/rh-requests";
const MANAGER_REPORTS_PATH = "/workspace/manager/reports";

const DECISION_KEYS = ["Continue", "Adjust", "Stop", "Other"] as const;
type DecisionBucket = (typeof DECISION_KEYS)[number];

const CHART_BUCKET_FILL: Record<DecisionBucket, string> = {
    Continue: "#059669",
    Adjust: "#d97706",
    Stop: "#dc2626",
    Other: "#7c3aed",
};

function confidencePercent(c: number | null | undefined): number {
    const n = Number(c ?? 0);
    if (!Number.isFinite(n)) return 0;
    if (n > 1 && n <= 100) return Math.round(n);
    return Math.round(n * 100);
}

function normalizeBucket(decision: string): DecisionBucket {
    const k = String(decision ?? "").trim().toLowerCase();
    if (k === "continue") return "Continue";
    if (k === "adjust") return "Adjust";
    if (k === "stop") return "Stop";
    return "Other";
}

function scoreDisplay(score: number | null | undefined): string {
    const n = Number(score ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)} / 10`;
}

function confidenceBandIndex(pct: number): 0 | 1 | 2 {
    if (pct < 50) return 0;
    if (pct < 80) return 1;
    return 2;
}

const DECISION_LOG_KPI_CLASS =
    "relative flex h-full min-h-[5.75rem] flex-col overflow-hidden rounded-xl border border-secondary bg-primary p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-secondary/30 hover:shadow-md sm:min-h-[6rem]";

function escapeCsvCell(value: string): string {
    const v = String(value).replace(/"/g, '""');
    if (/[",\n\r]/.test(v)) return `"${v}"`;
    return v;
}

function buildAndDownloadDecisionsCsv(rows: CopilotDecision[]) {
    const header = ["id", "project_id", "project_name", "decision", "score", "confidence_pct", "created_at", "reason_preview"];
    const lines = [header.map(escapeCsvCell).join(",")];
    for (const d of rows) {
        const reason = stripTechnicalScoringSegments(d.reason ?? "").replace(/\s+/g, " ").trim();
        const preview = reason.length > 800 ? `${reason.slice(0, 797)}…` : reason;
        const cells = [
            String(d.id),
            d.project_id ?? "",
            d.project_name ?? "",
            String(d.decision ?? ""),
            String(d.score ?? ""),
            String(confidencePercent(d.confidence)),
            d.created_at,
            preview,
        ];
        lines.push(cells.map(escapeCsvCell).join(","));
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decisions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function displayCountForBucket(counts: Record<string, number>, bucketCounts: Record<DecisionBucket, number>, otherCount: number, k: DecisionBucket): number {
    if (k === "Other") return otherCount;
    return (counts[k as keyof typeof counts] as number | undefined) ?? bucketCounts[k];
}

function timeAgo(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const m = Math.floor((Date.now() - t) / 60_000);
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
}

function oneLineSummary(d: CopilotDecision, max = 72): string {
    const raw = stripTechnicalScoringSegments(d.reason ?? "").replace(/\s+/g, " ").trim();
    if (!raw) return "—";
    if (raw.length <= max) return raw;
    return `${raw.slice(0, Math.max(0, max - 1))}…`;
}

function shortBusinessSummary(d: CopilotDecision): string {
    const raw = stripTechnicalScoringSegments(d.reason ?? "").replace(/\s+/g, " ").trim();
    if (!raw) return "Synthèse indisponible pour cette entrée.";
    if (raw.length <= 140) return raw;
    return `${raw.slice(0, 137)}…`;
}

function detectMotif(reason: string): string | null {
    const r = reason.toLowerCase();
    if (r.includes("skill") || r.includes("compétence")) return "skills_gap";
    if (r.includes("overload") || r.includes("surcharge") || r.includes("charge")) return "overload";
    if (r.includes("budget")) return "budget";
    if (r.includes("stable")) return "stable";
    if (r.includes("fragil")) return "fragility";
    if (r.includes("depend")) return "dependency";
    return null;
}

const MOTIF_LABELS: Record<string, string> = {
    skills_gap: "Compétences",
    overload: "Charge",
    budget: "Budget",
    stable: "Stabilité",
    fragility: "Fragilité",
    dependency: "Dépendance",
};

function spotlightDecision(list: CopilotDecision[]): CopilotDecision | null {
    if (!list.length) return null;
    const stops = list.filter((d) => normalizeBucket(d.decision) === "Stop");
    if (stops.length) {
        return [...stops].sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0) || confidencePercent(a.confidence) - confidencePercent(b.confidence))[0];
    }
    const adjusts = list.filter((d) => normalizeBucket(d.decision) === "Adjust");
    if (adjusts.length) {
        const lowScore = [...adjusts].sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))[0];
        if (Number(lowScore.score ?? 10) < 6) return lowScore;
    }
    const byConf = [...list].sort((a, b) => confidencePercent(a.confidence) - confidencePercent(b.confidence));
    if (byConf[0] && confidencePercent(byConf[0].confidence) < 55) return byConf[0];
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function recommendedAction(d: CopilotDecision): string {
    const b = normalizeBucket(d.decision);
    if (b === "Stop") return "Arbitrage managérial urgent : sécuriser le périmètre et les ressources.";
    if (b === "Adjust") return "Planifier une revue courte et ajuster jalons ou capacité.";
    if (b === "Continue") return "Maintenir le pilotage et surveiller les indicateurs clés.";
    return "Consolider le contexte et valider la suite avec l'équipe.";
}

function decisionBadgeClass(decision: string): string {
    const b = normalizeBucket(decision);
    if (b === "Continue") return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
    if (b === "Adjust") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
    if (b === "Stop") return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    return "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100";
}

function heatmapIntensityClass(n: number, max: number): string {
    if (max <= 0 || n <= 0) return "bg-secondary_subtle text-tertiary";
    const r = n / max;
    if (r > 0.66) return "bg-violet-600 text-white shadow-inner dark:bg-violet-500";
    if (r > 0.33) return "bg-violet-300/90 text-violet-950 dark:bg-violet-400/40 dark:text-violet-50";
    return "bg-violet-100/90 text-violet-900 dark:bg-violet-950/35 dark:text-violet-100";
}

export default function ManagerDecisionLogPage() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    const [filterDecision, setFilterDecision] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [filterPeriod, setFilterPeriod] = useState<"all" | "7d" | "30d" | "90d">("all");
    const [heatmapFilter, setHeatmapFilter] = useState<{ bucket: DecisionBucket; band: 0 | 1 | 2 } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<CopilotDecision | null>(null);

    const { data, isLoading, error } = useDecisions({ limit: 100 });
    const { data: projectsData } = useProjects({ limit: 100 });

    const decisions = data?.decisions ?? [];
    const counts = data?.by_decision ?? {};
    const projects = projectsData?.items ?? [];

    const otherCount = useMemo(() => {
        const fromApi = (counts.Proceed ?? 0) + (counts.Reject ?? 0);
        const derived = decisions.filter((d) => normalizeBucket(d.decision) === "Other").length;
        return Math.max(fromApi, derived);
    }, [counts, decisions]);

    const bucketCounts = useMemo(() => {
        const m: Record<DecisionBucket, number> = { Continue: 0, Adjust: 0, Stop: 0, Other: 0 };
        for (const d of decisions) {
            m[normalizeBucket(d.decision)] += 1;
        }
        return m;
    }, [decisions]);

    const avgConfidence = useMemo(() => {
        if (!decisions.length) return null;
        const s = decisions.reduce((acc, d) => acc + confidencePercent(d.confidence), 0);
        return Math.round(s / decisions.length);
    }, [decisions]);

    const avgScore = useMemo(() => {
        if (!decisions.length) return null;
        const s = decisions.reduce((acc, d) => acc + Number(d.score ?? 0), 0);
        return Math.round((s / decisions.length) * 10) / 10;
    }, [decisions]);

    const spotlight = useMemo(() => spotlightDecision(decisions), [decisions]);

    /** Filtre décision (KPI) et filtre heatmap sont exclusifs : la heatmap définit déjà le bucket, sinon filtre KPI / « Autre ». */
    const filteredDecisions = useMemo(() => {
        let list = decisions;
        if (heatmapFilter) {
            list = list.filter((d) => {
                if (normalizeBucket(d.decision) !== heatmapFilter.bucket) return false;
                return confidenceBandIndex(confidencePercent(d.confidence)) === heatmapFilter.band;
            });
        } else if (filterDecision === "other") {
            list = list.filter((d) => normalizeBucket(d.decision) === "Other");
        } else if (filterDecision !== "all") {
            list = list.filter((d) => normalizeBucket(d.decision) === filterDecision);
        }
        if (filterProject !== "all") list = list.filter((d) => d.project_id === filterProject);
        if (filterPeriod !== "all") {
            const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
            const cut = Date.now() - days * 86_400_000;
            list = list.filter((d) => new Date(d.created_at).getTime() >= cut);
        }
        return list;
    }, [decisions, filterDecision, filterProject, filterPeriod, heatmapFilter]);

    const motifCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of filteredDecisions) {
            const m = detectMotif(d.reason ?? "");
            if (!m) continue;
            map.set(m, (map.get(m) ?? 0) + 1);
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [filteredDecisions]);

    const projectImpact = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        for (const d of filteredDecisions) {
            const id = d.project_id ?? "";
            if (!id) continue;
            const cur = map.get(id) ?? { name: d.project_name ?? "Projet", count: 0 };
            cur.count += 1;
            if (d.project_name) cur.name = d.project_name;
            map.set(id, cur);
        }
        return [...map.entries()]
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [filteredDecisions]);

    const heatmapMatrix = useMemo(() => {
        const matrix: number[][] = DECISION_KEYS.map(() => [0, 0, 0]);
        for (const d of decisions) {
            const row = DECISION_KEYS.indexOf(normalizeBucket(d.decision));
            const col = confidenceBandIndex(confidencePercent(d.confidence));
            matrix[row][col] += 1;
        }
        let max = 0;
        for (const r of matrix) for (const c of r) if (c > max) max = c;
        return { matrix, max };
    }, [decisions]);

    const tableSortedRows = useMemo(
        () => [...filteredDecisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [filteredDecisions],
    );

    const openDrawer = useCallback((d: CopilotDecision) => {
        setSelected(d);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    const clearHeatmap = useCallback(() => setHeatmapFilter(null), []);

    const resetAllFilters = useCallback(() => {
        setFilterDecision("all");
        setFilterProject("all");
        setFilterPeriod("all");
        setHeatmapFilter(null);
    }, []);

    const onHeatmapCell = useCallback((bucket: DecisionBucket, band: 0 | 1 | 2) => {
        setHeatmapFilter((prev) => {
            const togglingOff = prev?.bucket === bucket && prev.band === band;
            return togglingOff ? null : { bucket, band };
        });
    }, []);

    const bucketLabel = useCallback(
        (bucket: DecisionBucket) => {
            if (bucket === "Continue") return t("managerWorkspace.decisionLogPage.bucketContinue");
            if (bucket === "Adjust") return t("managerWorkspace.decisionLogPage.bucketAdjust");
            if (bucket === "Stop") return t("managerWorkspace.decisionLogPage.bucketStop");
            return t("managerWorkspace.decisionLogPage.bucketOther");
        },
        [t],
    );

    const heatmapBandFull = useCallback(
        (band: 0 | 1 | 2) => {
            if (band === 0) return t("managerWorkspace.decisionLogPage.heatmapBandLow");
            if (band === 1) return t("managerWorkspace.decisionLogPage.heatmapBandMid");
            return t("managerWorkspace.decisionLogPage.heatmapBandHigh");
        },
        [t],
    );

    const heatmapBandCol = useCallback(
        (band: 0 | 1 | 2) => {
            if (band === 0) return t("managerWorkspace.decisionLogPage.heatmapColLow");
            if (band === 1) return t("managerWorkspace.decisionLogPage.heatmapColMid");
            return t("managerWorkspace.decisionLogPage.heatmapColHigh");
        },
        [t],
    );

    const distributionBars = useMemo(() => {
        const m: Record<DecisionBucket, number> = { Continue: 0, Adjust: 0, Stop: 0, Other: 0 };
        for (const d of filteredDecisions) {
            m[normalizeBucket(d.decision)] += 1;
        }
        return (DECISION_KEYS as readonly DecisionBucket[]).map((k) => ({
            key: k,
            name: bucketLabel(k),
            value: m[k],
            fill: CHART_BUCKET_FILL[k],
        }));
    }, [bucketLabel, filteredDecisions]);

    const confidenceTrendPoints = useMemo(() => {
        const sorted = [...filteredDecisions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const slice = sorted.slice(-28);
        return slice.map((d, idx) => ({
            idx: idx + 1,
            label: new Date(d.created_at).toLocaleDateString(localeForDateFormatting(i18n.language), { month: "short", day: "numeric" }),
            conf: confidencePercent(d.confidence),
        }));
    }, [filteredDecisions]);

    const onExportCsv = useCallback(() => {
        if (!filteredDecisions.length) return;
        buildAndDownloadDecisionsCsv(filteredDecisions);
    }, [filteredDecisions]);

    const filtersDirty = heatmapFilter != null || filterDecision !== "all" || filterProject !== "all" || filterPeriod !== "all";

    const topbarTrailing = useMemo((): ReactNode => {
        return (
            <Button type="button" color="secondary" size="sm" onClick={onExportCsv} isDisabled={!filteredDecisions.length}>
                {t("managerWorkspace.decisionLogPage.exportCsv")}
            </Button>
        );
    }, [filteredDecisions.length, onExportCsv, t]);

    /** Une cellule heatmap définit déjà le bucket : on retire le filtre KPI décision pour éviter 0 résultat. */
    useEffect(() => {
        if (heatmapFilter) setFilterDecision("all");
    }, [heatmapFilter]);

    useWorkspaceTopbarMeta(t("managerWorkspace.decisionLogPage.heroTitle"), t("managerWorkspace.decisionLogPage.heroSubtitle"), topbarTrailing);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.decisionLogPage.shellTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6 pb-10">
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                    <KpiCard
                        label={t("managerWorkspace.decisionLogPage.kpiTotal")}
                        value={data?.count ?? decisions.length}
                        tone="brand"
                        active={filterDecision === "all" && !heatmapFilter}
                        onClick={() => {
                            setFilterDecision("all");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Continue")}
                        value={counts.Continue ?? bucketCounts.Continue}
                        tone="safe"
                        active={filterDecision === "Continue"}
                        onClick={() => {
                            setFilterDecision("Continue");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Adjust")}
                        value={counts.Adjust ?? bucketCounts.Adjust}
                        tone="warn"
                        active={filterDecision === "Adjust"}
                        onClick={() => {
                            setFilterDecision("Adjust");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Stop")}
                        value={counts.Stop ?? bucketCounts.Stop}
                        tone="danger"
                        active={filterDecision === "Stop"}
                        onClick={() => {
                            setFilterDecision("Stop");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Other")}
                        value={otherCount}
                        tone="neutral"
                        active={filterDecision === "other"}
                        onClick={() => {
                            setFilterDecision("other");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={t("managerWorkspace.decisionLogPage.kpiAvgConfidence")}
                        value={
                            avgConfidence != null ? (
                                <span className="text-2xl font-semibold tabular-nums leading-tight text-primary">
                                    {avgConfidence}
                                    <span className="text-sm font-medium text-tertiary">%</span>
                                </span>
                            ) : (
                                <span className="text-2xl font-semibold text-tertiary">—</span>
                            )
                        }
                        tone="brand"
                        active={false}
                        onClick={() => {
                            setFilterDecision("all");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={t("managerWorkspace.decisionLogPage.kpiAvgScore")}
                        value={
                            avgScore != null ? (
                                <span className="text-2xl font-semibold tabular-nums leading-tight text-primary">{avgScore.toFixed(1)}</span>
                            ) : (
                                <span className="text-2xl font-semibold text-tertiary">—</span>
                            )
                        }
                        tone="brand"
                        active={false}
                        onClick={() => {
                            setFilterDecision("all");
                            clearHeatmap();
                        }}
                    />
                </section>

                <section className="sticky top-0 z-30 rounded-2xl border border-secondary/90 bg-primary/90 px-3 py-3 shadow-sm shadow-secondary/20 ring-1 ring-secondary/40 backdrop-blur-md md:px-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                {t("managerWorkspace.decisionLogPage.filterProjectLabel")}
                            </span>
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                            >
                                <option value="all">{t("managerWorkspace.decisionLogPage.filterProjectAll")}</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                {t("managerWorkspace.decisionLogPage.filterDecisionLabel")}
                            </span>
                            <select
                                value={heatmapFilter ? "all" : filterDecision}
                                onChange={(e) => {
                                    clearHeatmap();
                                    setFilterDecision(e.target.value);
                                }}
                                disabled={Boolean(heatmapFilter)}
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="all">{t("managerWorkspace.decisionLogPage.filterDecisionAll")}</option>
                                <option value="Continue">{bucketLabel("Continue")}</option>
                                <option value="Adjust">{bucketLabel("Adjust")}</option>
                                <option value="Stop">{bucketLabel("Stop")}</option>
                                <option value="other">{bucketLabel("Other")}</option>
                            </select>
                        </label>
                        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                {t("managerWorkspace.decisionLogPage.filterPeriodLabel")}
                            </span>
                            <select
                                value={filterPeriod}
                                onChange={(e) => setFilterPeriod(e.target.value as "all" | "7d" | "30d" | "90d")}
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                            >
                                <option value="all">{t("managerWorkspace.decisionLogPage.periodAll")}</option>
                                <option value="7d">{t("managerWorkspace.decisionLogPage.period7d")}</option>
                                <option value="30d">{t("managerWorkspace.decisionLogPage.period30d")}</option>
                                <option value="90d">{t("managerWorkspace.decisionLogPage.period90d")}</option>
                            </select>
                        </label>
                        <Button type="button" color="secondary" size="sm" className="w-full shrink-0 lg:w-auto" isDisabled={!filtersDirty} onClick={resetAllFilters}>
                            {t("managerWorkspace.decisionLogPage.resetFilters")}
                        </Button>
                    </div>
                    {heatmapFilter ? (
                        <p className="mt-2 text-xs text-tertiary">
                            {t("managerWorkspace.decisionLogPage.heatmapFilterLine", {
                                bucket: bucketLabel(heatmapFilter.bucket),
                                band: heatmapBandFull(heatmapFilter.band),
                            })}
                        </p>
                    ) : null}
                </section>

                {isLoading ? <p className="text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.loading")}</p> : null}
                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                        {t("managerWorkspace.decisionLogPage.loadError")}
                    </div>
                ) : null}

                {!isLoading && !error ? (
                    <>
                        {filteredDecisions.length === 0 && decisions.length > 0 ? (
                            <div className="rounded-2xl border border-dashed border-secondary/80 bg-primary px-4 py-6 text-center shadow-sm">
                                <p className="text-sm text-secondary">{t("managerWorkspace.decisionLogPage.emptyFiltered")}</p>
                                <Button type="button" color="primary" size="sm" className="mt-3" onClick={resetAllFilters}>
                                    {t("managerWorkspace.decisionLogPage.showAllDecisions")}
                                </Button>
                            </div>
                        ) : null}

                        <section className="relative overflow-hidden rounded-2xl border border-secondary/80 bg-primary p-5 shadow-md ring-1 ring-secondary/30 transition-shadow hover:shadow-lg md:p-6">
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-secondary to-brand-secondary/50" aria-hidden />
                            <div className="pl-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-secondary">{t("managerWorkspace.decisionLogPage.spotlightEyebrow")}</p>
                                <h2 className="mt-1 text-base font-semibold tracking-tight text-primary md:text-lg">{t("managerWorkspace.decisionLogPage.spotlightTitle")}</h2>
                                {spotlight ? (
                                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={cx("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", decisionBadgeClass(spotlight.decision))}>
                                                    {spotlight.decision}
                                                </span>
                                                <span className="truncate text-sm font-medium text-primary">{spotlight.project_name?.trim() || "—"}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-xs text-secondary">
                                                <span>
                                                    <span className="text-tertiary">{t("managerWorkspace.decisionLogPage.timelineScore")} · </span>
                                                    <span className="font-semibold tabular-nums text-primary">{scoreDisplay(spotlight.score)}</span>
                                                </span>
                                                <span>
                                                    <span className="text-tertiary">{t("managerWorkspace.decisionLogPage.timelineConfidence")} · </span>
                                                    <span className="font-semibold tabular-nums text-primary">{confidencePercent(spotlight.confidence)}%</span>
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-sm leading-snug text-secondary">{shortBusinessSummary(spotlight)}</p>
                                            <p className="text-xs font-medium leading-snug text-brand-secondary">{recommendedAction(spotlight)}</p>
                                        </div>
                                        <Button type="button" color="primary" size="md" className="shrink-0 md:self-end" onClick={() => openDrawer(spotlight)}>
                                            {t("managerWorkspace.decisionLogPage.timelineViewDetail")}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.spotlightEmpty")}</p>
                                )}
                            </div>
                        </section>

                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <article className="rounded-2xl border border-secondary/80 bg-primary p-4 shadow-sm ring-1 ring-secondary/25 md:p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.chartDistributionTitle")}</h3>
                                    <div className="mt-3 h-52 w-full min-w-0">
                                        {distributionBars.some((b) => b.value > 0) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={distributionBars} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-secondary/60" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} className="text-tertiary" axisLine={false} tickLine={false} />
                                                    <YAxis width={28} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                    <Tooltip
                                                        cursor={{ fill: "rgba(139, 92, 246, 0.06)" }}
                                                        contentStyle={{ borderRadius: 12, border: "1px solid rgb(226 232 240)", fontSize: 12 }}
                                                    />
                                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                                        {distributionBars.map((e) => (
                                                            <Cell key={e.key} fill={e.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.chartEmpty")}</div>
                                        )}
                                    </div>
                                </article>
                                <article className="rounded-2xl border border-secondary/80 bg-primary p-4 shadow-sm ring-1 ring-secondary/25 md:p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.chartTrendTitle")}</h3>
                                    <div className="mt-3 h-52 w-full min-w-0">
                                        {confidenceTrendPoints.length > 1 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={confidenceTrendPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-secondary/60" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} className="text-tertiary" />
                                                    <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgb(226 232 240)", fontSize: 12 }} />
                                                    <Line type="monotone" dataKey="conf" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3, fill: "#7c3aed" }} activeDot={{ r: 5 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.chartTrendEmpty")}</div>
                                        )}
                                    </div>
                                </article>
                            </div>
                            <div className="space-y-5">
                                <article className="rounded-2xl border border-secondary/80 bg-primary p-4 shadow-sm ring-1 ring-secondary/25 md:p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsMotifs")}</h3>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {motifCounts.length ? (
                                            motifCounts.map(([key, n]) => (
                                                <span
                                                    key={key}
                                                    className="rounded-full border border-secondary/80 bg-secondary_subtle/60 px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:border-brand-secondary/40"
                                                >
                                                    {MOTIF_LABELS[key] ?? key} · {n}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsMotifsEmpty")}</p>
                                        )}
                                    </div>
                                </article>
                                <article className="rounded-2xl border border-secondary/80 bg-primary p-4 shadow-sm ring-1 ring-secondary/25 md:p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsProjects")}</h3>
                                    <ul className="mt-3 divide-y divide-secondary/60">
                                        {projectImpact.length ? (
                                            projectImpact.map((p) => (
                                                <li key={p.id} className="flex justify-between gap-2 py-2.5 text-sm first:pt-0">
                                                    <span className="truncate font-medium text-primary">{p.name}</span>
                                                    <span className="shrink-0 tabular-nums text-tertiary">{p.count}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="py-2 text-sm text-tertiary">{t("managerWorkspace.decisionLogPage.analyticsProjectsEmpty")}</li>
                                        )}
                                    </ul>
                                </article>
                            </div>
                        </div>

                        <section className="rounded-2xl border border-secondary/80 bg-primary p-4 shadow-md ring-1 ring-secondary/30 md:p-5">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-semibold text-primary">{t("managerWorkspace.decisionLogPage.heatmapTitle")}</h2>
                                    <p className="mt-0.5 text-xs text-tertiary">{t("managerWorkspace.decisionLogPage.heatmapHint")}</p>
                                </div>
                                {heatmapFilter ? (
                                    <button type="button" className="text-xs font-semibold text-brand-secondary hover:underline" onClick={clearHeatmap}>
                                        {t("managerWorkspace.decisionLogPage.resetHeatmap")}
                                    </button>
                                ) : null}
                            </div>
                            <div className="mt-4 overflow-x-auto rounded-xl border border-secondary/60 bg-secondary_subtle/30 p-2">
                                <div className="inline-block min-w-full overflow-hidden rounded-lg">
                                    <div className="grid grid-cols-[minmax(0,5.5rem)_repeat(3,minmax(0,1fr))] gap-px bg-secondary/40 p-px text-[10px] font-semibold uppercase text-tertiary">
                                        <div className="rounded-tl-md bg-primary px-2 py-2" />
                                        {([0, 1, 2] as const).map((band) => (
                                            <div key={band} className="bg-primary px-2 py-2 text-center last:rounded-tr-md">
                                                {heatmapBandCol(band)}
                                            </div>
                                        ))}
                                        {(DECISION_KEYS as readonly DecisionBucket[]).map((bucket, row) => (
                                            <Fragment key={bucket}>
                                                <div
                                                    className={cx(
                                                        "flex items-center bg-primary px-2 py-2 text-[10px] font-semibold text-secondary",
                                                    )}
                                                >
                                                    {bucketLabel(bucket)}
                                                </div>
                                                {([0, 1, 2] as const).map((band) => {
                                                    const n = heatmapMatrix.matrix[row][band];
                                                    const active = heatmapFilter?.bucket === bucket && heatmapFilter.band === band;
                                                    return (
                                                        <button
                                                            key={`${bucket}-${band}`}
                                                            type="button"
                                                            onClick={() => onHeatmapCell(bucket, band)}
                                                            className={cx(
                                                                "min-h-[2.5rem] px-2 py-2 text-center text-xs font-bold tabular-nums transition-all duration-150",
                                                                heatmapIntensityClass(n, heatmapMatrix.max),
                                                                active
                                                                    ? "z-[1] ring-2 ring-brand-secondary ring-offset-2 ring-offset-primary"
                                                                    : "hover:brightness-[1.02] dark:hover:brightness-110",
                                                            )}
                                                        >
                                                            {n}
                                                        </button>
                                                    );
                                                })}
                                            </Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {tableSortedRows.length > 0 ? (
                            <section className="rounded-2xl border border-secondary/80 bg-primary shadow-md ring-1 ring-secondary/30">
                                <div className="flex flex-col gap-0.5 border-b border-secondary/70 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-primary">{t("managerWorkspace.decisionLogPage.tableTitle")}</h2>
                                        <p className="mt-0.5 text-xs text-tertiary">
                                            {t("managerWorkspace.decisionLogPage.tableSubtitle", { count: tableSortedRows.length })}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-secondary/80 bg-secondary_subtle/40 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                                <th className="px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColDecision")}</th>
                                                <th className="px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColProject")}</th>
                                                <th className="px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColScore")}</th>
                                                <th className="px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColConfidence")}</th>
                                                <th className="min-w-[12rem] px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColSummary")}</th>
                                                <th className="px-4 py-3 md:px-5">{t("managerWorkspace.decisionLogPage.tableColDate")}</th>
                                                <th className="w-10 px-2 py-3" aria-label={t("managerWorkspace.decisionLogPage.tableColAction")} />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary/60">
                                            {tableSortedRows.map((d) => (
                                                <tr
                                                    key={d.id}
                                                    className="cursor-pointer outline-none transition-colors hover:bg-brand-primary/[0.04] focus-visible:bg-brand-primary/[0.06] focus-visible:ring-2 focus-visible:ring-brand-secondary/30"
                                                    onClick={() => openDrawer(d)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            openDrawer(d);
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    role="row"
                                                >
                                                    <td className="px-4 py-3 md:px-5">
                                                        <span className={cx("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(d.decision))}>
                                                            {d.decision}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[10rem] truncate px-4 py-3 font-medium text-primary md:max-w-[14rem] md:px-5">{d.project_name?.trim() || "—"}</td>
                                                    <td className="px-4 py-3 tabular-nums text-secondary md:px-5">{scoreDisplay(d.score)}</td>
                                                    <td className="px-4 py-3 tabular-nums text-secondary md:px-5">{confidencePercent(d.confidence)}%</td>
                                                    <td className="max-w-xs truncate px-4 py-3 text-secondary md:px-5">{oneLineSummary(d)}</td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-tertiary md:px-5">{timeAgo(d.created_at)}</td>
                                                    <td className="px-2 py-3 text-tertiary">
                                                        <ChevronRight className="size-4" aria-hidden />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ) : null}
                    </>
                ) : null}
            </div>

            <DecisionDrawer
                open={drawerOpen}
                decision={selected}
                onClose={closeDrawer}
                onCopied={() => push("Résumé copié dans le presse-papiers.", "success")}
                onCopyFailed={() => push("Copie impossible (navigateur ou permissions).", "error")}
            />
        </WorkspacePageShell>
    );
}

function KpiCard({
    label,
    value,
    tone,
    active,
    onClick,
}: {
    label: string;
    value: ReactNode;
    tone: "brand" | "safe" | "warn" | "danger" | "neutral";
    active?: boolean;
    onClick: () => void;
}) {
    const ring =
        tone === "danger"
            ? "ring-red-500/15"
            : tone === "warn"
              ? "ring-amber-500/15"
              : tone === "safe"
                ? "ring-emerald-500/15"
                : tone === "brand"
                  ? "ring-brand-secondary/20"
                  : "ring-secondary/20";
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                DECISION_LOG_KPI_CLASS,
                "text-left ring-1",
                ring,
                active ? "border-brand-secondary bg-brand-primary/5 shadow-md" : "border-secondary",
            )}
        >
            <div className="flex h-full flex-col justify-between gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
                <div className="text-2xl font-semibold tabular-nums leading-tight text-primary">{value}</div>
            </div>
        </button>
    );
}

function DecisionLifecycle({ decision, compact }: { decision: CopilotDecision; compact?: boolean }) {
    const p = decision.payload ?? {};
    const reviewed = Boolean(p.manager_reviewed ?? p.reviewed_by_manager ?? p.manager_validation);
    const actionDone = Boolean(p.action_completed ?? p.action_done ?? p.follow_up_done);
    const steps = [
        { label: "Analyse", done: true },
        { label: "Recommandation", done: Boolean((decision.reason ?? "").trim().length) },
        { label: "Revue manager", done: reviewed },
        { label: "Action", done: actionDone },
    ];
    return (
        <ol className={cx("flex flex-wrap gap-2", compact ? "mt-3" : "mt-4")}>
            {steps.map((s) => (
                <li
                    key={s.label}
                    className={cx(
                        "rounded-lg border px-2 py-1 text-[10px] font-medium",
                        s.done ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100" : "border-secondary bg-secondary_subtle text-tertiary",
                    )}
                >
                    {s.label} · {s.done ? "Complété" : "En attente"}
                </li>
            ))}
        </ol>
    );
}

function DecisionDrawer({
    open,
    decision,
    onClose,
    onCopied,
    onCopyFailed,
}: {
    open: boolean;
    decision: CopilotDecision | null;
    onClose: () => void;
    onCopied: () => void;
    onCopyFailed: () => void;
}) {
    const { t } = useTranslation("common");
    if (!open || !decision) return null;

    const summaryText = [
        decision.project_name ?? "Projet",
        decision.decision,
        `Score ${scoreDisplay(decision.score)}`,
        `Confiance ${confidencePercent(decision.confidence)} %`,
        stripTechnicalScoringSegments(decision.reason ?? "").slice(0, 400),
    ].join("\n");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(summaryText);
            onCopied();
        } catch {
            onCopyFailed();
        }
    };

    const pid = decision.project_id?.trim();
    const p = decision.payload ?? {};
    const reviewed = Boolean(p.manager_reviewed ?? p.reviewed_by_manager ?? p.manager_validation);
    const actionDone = Boolean(p.action_completed ?? p.action_done ?? p.follow_up_done);
    const createdLabel = new Date(decision.created_at).toLocaleString(localeForDateFormatting(i18n.language), { dateStyle: "medium", timeStyle: "short" });

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-label={t("managerWorkspace.decisionLogPage.drawerCloseAria")} />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col overflow-hidden border-l border-secondary/80 bg-primary shadow-2xl sm:max-w-lg">
                <header className="border-b border-secondary/80 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">{t("managerWorkspace.decisionLogPage.drawerEyebrow")}</p>
                            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-primary">{decision.project_name?.trim() || "—"}</h2>
                            <span className={cx("mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(decision.decision))}>
                                {decision.decision}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="rounded-xl border border-secondary/80 px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary_subtle"
                            onClick={onClose}
                        >
                            {t("managerWorkspace.decisionLogPage.drawerClose")}
                        </button>
                    </div>
                </header>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    <dl className="grid gap-2 text-xs">
                        <Row label={t("managerWorkspace.decisionLogPage.timelineScore")} value={scoreDisplay(decision.score)} />
                        <Row label={t("managerWorkspace.decisionLogPage.timelineConfidence")} value={`${confidencePercent(decision.confidence)} %`} />
                        <Row label={t("managerWorkspace.decisionLogPage.drawerSource")} value={decision.scope || "—"} />
                        <Row label={t("managerWorkspace.decisionLogPage.drawerTimestamp")} value={createdLabel} />
                    </dl>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerRecommended")}</h3>
                        <p className="mt-2 text-sm font-medium leading-snug text-brand-secondary">{recommendedAction(decision)}</p>
                    </section>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerExplanation")}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            {formatUserFacingExplanation(decision.reason ?? "", {
                                score: Number(decision.score ?? 0),
                                decision: decision.decision,
                            })}
                        </p>
                    </section>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerTimeline")}</h3>
                        <div className="mt-2 space-y-2">
                            <div className="flex gap-3 rounded-xl border border-secondary/60 bg-primary_alt/40 px-3 py-2.5">
                                <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-secondary" aria-hidden />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-tertiary">{t("managerWorkspace.decisionLogPage.drawerTimelineCreated")}</p>
                                    <p className="text-sm text-secondary">{createdLabel}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 rounded-xl border border-secondary/60 bg-primary_alt/40 px-3 py-2.5">
                                <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" aria-hidden />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-tertiary">{t("managerWorkspace.decisionLogPage.drawerTimelineReco")}</p>
                                    <p className="text-sm text-secondary">
                                        {(decision.reason ?? "").trim() ? t("managerWorkspace.decisionLogPage.drawerTimelineDone") : t("managerWorkspace.decisionLogPage.drawerTimelinePending")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 rounded-xl border border-secondary/60 bg-primary_alt/40 px-3 py-2.5">
                                <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" aria-hidden />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-tertiary">{t("managerWorkspace.decisionLogPage.drawerTimelineReview")}</p>
                                    <p className="text-sm text-secondary">
                                        {reviewed ? t("managerWorkspace.decisionLogPage.drawerTimelineDone") : t("managerWorkspace.decisionLogPage.drawerTimelinePending")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 rounded-xl border border-secondary/60 bg-primary_alt/40 px-3 py-2.5">
                                <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" aria-hidden />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-tertiary">{t("managerWorkspace.decisionLogPage.drawerTimelineAction")}</p>
                                    <p className="text-sm text-secondary">
                                        {actionDone ? t("managerWorkspace.decisionLogPage.drawerTimelineDone") : t("managerWorkspace.decisionLogPage.drawerTimelinePending")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerLifecycle")}</h3>
                        <DecisionLifecycle decision={decision} />
                    </section>
                    {decision.payload && Object.keys(decision.payload).length > 0 ? (
                        <p className="text-xs text-tertiary">{t("managerWorkspace.decisionLogPage.drawerPayloadNote")}</p>
                    ) : null}
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerLinks")}</h3>
                        <div className="mt-2 flex flex-col gap-2">
                            {pid ? (
                                <Link
                                    to={managerProjectsOpenModalPath(pid)}
                                    className="rounded-xl border border-brand-secondary/35 bg-brand-primary/10 px-3 py-2.5 text-center text-xs font-semibold text-brand-secondary transition-colors hover:bg-brand-primary/18"
                                >
                                    {t("managerWorkspace.decisionLogPage.drawerLinkProject")}
                                </Link>
                            ) : null}
                            <Link
                                to={MANAGER_RH_REQUESTS_PATH}
                                className="rounded-xl border border-secondary/80 px-3 py-2.5 text-center text-xs font-semibold text-secondary transition-colors hover:bg-secondary_subtle"
                            >
                                {t("managerWorkspace.decisionLogPage.drawerLinkRh")}
                            </Link>
                            <Link
                                to={MANAGER_REPORTS_PATH}
                                className="rounded-xl border border-secondary/80 px-3 py-2.5 text-center text-xs font-semibold text-secondary transition-colors hover:bg-secondary_subtle"
                            >
                                {t("managerWorkspace.decisionLogPage.drawerLinkReports")}
                            </Link>
                        </div>
                    </section>
                </div>
                <footer className="border-t border-secondary/80 px-5 py-4">
                    <button type="button" className="w-full rounded-xl border border-secondary px-3 py-2.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary_subtle" onClick={() => void copy()}>
                        {t("managerWorkspace.decisionLogPage.drawerCopy")}
                    </button>
                </footer>
            </aside>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-3 py-2">
            <dt className="text-tertiary">{label}</dt>
            <dd className="max-w-[65%] text-right font-medium text-primary">{value}</dd>
        </div>
    );
}
