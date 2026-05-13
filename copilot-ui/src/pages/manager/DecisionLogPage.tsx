import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useDecisions } from "@/hooks/useDecisions";
import { useProjects } from "@/hooks/useProjects";
import { formatUserFacingExplanation, stripTechnicalScoringSegments } from "@/lib/business-explanation";
import type { CopilotDecision } from "@/services/decisions.api";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const DECISION_KEYS = ["Continue", "Adjust", "Stop", "Other"] as const;
type DecisionBucket = (typeof DECISION_KEYS)[number];

function confidencePercent(c: number | null | undefined): number {
    const n = Number(c ?? 0);
    if (!Number.isFinite(n)) return 0;
    if (n > 1 && n <= 100) return Math.round(n);
    return Math.round(n * 100);
}

function normalizeBucket(decision: string): DecisionBucket {
    if (decision === "Continue" || decision === "Adjust" || decision === "Stop") return decision;
    return "Other";
}

function dominantLabelFr(bucket: DecisionBucket): string {
    if (bucket === "Adjust") return "des ajustements";
    if (bucket === "Stop") return "des décisions Stop";
    if (bucket === "Continue") return "des décisions de maintien du cap";
    return "des cas complémentaires ou atypiques";
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

const BAND_LABELS = ["Confiance faible", "Confiance moyenne", "Confiance élevée"] as const;

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

function periodKey(iso: string): "today" | "week" | "month" | "older" {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "older";
    const now = Date.now();
    const day = 86_400_000;
    if (now - t < day) return "today";
    if (now - t < 7 * day) return "week";
    if (now - t < 30 * day) return "month";
    return "older";
}

const PERIOD_ORDER: Array<{ key: "today" | "week" | "month" | "older"; title: string }> = [
    { key: "today", title: "Aujourd'hui" },
    { key: "week", title: "Cette semaine" },
    { key: "month", title: "Ce mois-ci" },
    { key: "older", title: "Plus anciennes" },
];

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
    const stops = list.filter((d) => d.decision === "Stop");
    if (stops.length) {
        return [...stops].sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0) || confidencePercent(a.confidence) - confidencePercent(b.confidence))[0];
    }
    const adjusts = list.filter((d) => d.decision === "Adjust");
    if (adjusts.length) {
        const lowScore = [...adjusts].sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))[0];
        if (Number(lowScore.score ?? 10) < 6) return lowScore;
    }
    const byConf = [...list].sort((a, b) => confidencePercent(a.confidence) - confidencePercent(b.confidence));
    if (byConf[0] && confidencePercent(byConf[0].confidence) < 55) return byConf[0];
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function recommendedAction(d: CopilotDecision): string {
    if (d.decision === "Stop") return "Arbitrage managérial urgent : sécuriser le périmètre et les ressources.";
    if (d.decision === "Adjust") return "Planifier une revue courte et ajuster jalons ou capacité.";
    if (d.decision === "Continue") return "Maintenir le pilotage et surveiller les indicateurs clés.";
    return "Consolider le contexte et valider la suite avec l'équipe.";
}

function decisionBadgeClass(decision: string): string {
    const b = normalizeBucket(decision);
    if (b === "Continue") return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
    if (b === "Adjust") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
    if (b === "Stop") return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    return "border-secondary bg-secondary_subtle text-secondary";
}

function heatmapIntensityClass(n: number, max: number): string {
    if (max <= 0 || n <= 0) return "bg-secondary_subtle/80";
    const r = n / max;
    if (r > 0.66) return "bg-red-500/85 text-white";
    if (r > 0.33) return "bg-amber-500/80 text-amber-950";
    return "bg-emerald-500/50 text-emerald-950";
}

export default function ManagerDecisionLogPage() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    const [filterDecision, setFilterDecision] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
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

    const dominantBucket = useMemo((): DecisionBucket => {
        let best: DecisionBucket = "Continue";
        let max = -1;
        (DECISION_KEYS as readonly DecisionBucket[]).forEach((k) => {
            const c = displayCountForBucket(counts, bucketCounts, otherCount, k);
            if (c > max) {
                max = c;
                best = k;
            }
        });
        return best;
    }, [bucketCounts, counts, otherCount]);

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

    const recentCount = useMemo(() => {
        const weekAgo = Date.now() - 7 * 86_400_000;
        return decisions.filter((d) => new Date(d.created_at).getTime() >= weekAgo).length;
    }, [decisions]);

    const trendPhrase = useMemo(() => {
        const sorted = [...decisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (sorted.length < 8) return null;
        const recent = sorted.slice(0, 12);
        const older = sorted.slice(12, 28);
        if (older.length < 6) return null;
        const pressure = (arr: CopilotDecision[]) =>
            arr.filter((d) => d.decision === "Stop" || d.decision === "Adjust").length / arr.length;
        const pr = pressure(recent);
        const po = pressure(older);
        if (pr > po + 0.12) return "Les arbitrages récents montrent davantage d'ajustements ou de freinages.";
        if (pr + 0.12 < po) return "Les décisions récentes sont un peu plus favorables qu'auparavant.";
        return null;
    }, [decisions]);

    const executiveBrief = useMemo(() => {
        const total = data?.count ?? decisions.length;
        if (!total) return "Aucune décision enregistrée pour l'instant. Les synthèses apparaîtront dès que le Copilot aura produit des arbitrages.";
        const dom = dominantLabelFr(dominantBucket);
        const conf = avgConfidence != null ? `${avgConfidence}` : "—";
        const score = avgScore != null ? `${avgScore.toFixed(1)}` : "—";
        const trend = trendPhrase ? `${trendPhrase} ` : "";
        return `Le Copilot a enregistré ${total} décision${total > 1 ? "s" : ""}. La majorité relève de ${dom}, avec une confiance moyenne d'environ ${conf} % et un score projet moyen de ${score} sur 10. ${trend}Une revue managériale sur les projets les plus sensibles reste recommandée.`;
    }, [data?.count, decisions.length, dominantBucket, avgConfidence, avgScore, trendPhrase]);

    const spotlight = useMemo(() => spotlightDecision(decisions), [decisions]);

    const motifCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of decisions) {
            const m = detectMotif(d.reason ?? "");
            if (!m) continue;
            map.set(m, (map.get(m) ?? 0) + 1);
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [decisions]);

    const projectImpact = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        for (const d of decisions) {
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
    }, [decisions]);

    const confidenceByBucket = useMemo(() => {
        const sums: Record<DecisionBucket, { sum: number; n: number }> = {
            Continue: { sum: 0, n: 0 },
            Adjust: { sum: 0, n: 0 },
            Stop: { sum: 0, n: 0 },
            Other: { sum: 0, n: 0 },
        };
        for (const d of decisions) {
            const b = normalizeBucket(d.decision);
            sums[b].sum += confidencePercent(d.confidence);
            sums[b].n += 1;
        }
        const out: Record<DecisionBucket, number | null> = { Continue: null, Adjust: null, Stop: null, Other: null };
        (DECISION_KEYS as readonly DecisionBucket[]).forEach((k) => {
            const { sum, n } = sums[k];
            if (n) out[k] = Math.round(sum / n);
        });
        return out;
    }, [decisions]);

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

    const filteredDecisions = useMemo(() => {
        let list = decisions;
        if (filterDecision === "other") {
            list = list.filter((d) => normalizeBucket(d.decision) === "Other");
        } else if (filterDecision !== "all") {
            list = list.filter((d) => d.decision === filterDecision);
        }
        if (filterProject !== "all") list = list.filter((d) => d.project_id === filterProject);
        if (heatmapFilter) {
            list = list.filter((d) => {
                if (normalizeBucket(d.decision) !== heatmapFilter.bucket) return false;
                return confidenceBandIndex(confidencePercent(d.confidence)) === heatmapFilter.band;
            });
        }
        return list;
    }, [decisions, filterDecision, filterProject, heatmapFilter]);

    const timelineGroups = useMemo(() => {
        const groups: Record<string, CopilotDecision[]> = { today: [], week: [], month: [], older: [] };
        const sorted = [...filteredDecisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        for (const d of sorted) {
            groups[periodKey(d.created_at)].push(d);
        }
        return groups;
    }, [filteredDecisions]);

    const openDrawer = useCallback((d: CopilotDecision) => {
        setSelected(d);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    const clearHeatmap = useCallback(() => setHeatmapFilter(null), []);

    const onHeatmapCell = useCallback((bucket: DecisionBucket, band: 0 | 1 | 2) => {
        setHeatmapFilter((prev) => (prev?.bucket === bucket && prev.band === band ? null : { bucket, band }));
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

    const adjustStopShare = useMemo(() => {
        if (!decisions.length) return 0;
        const n = decisions.filter((d) => d.decision === "Adjust" || d.decision === "Stop").length;
        return Math.round((n / decisions.length) * 100);
    }, [decisions]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.decisionLogPage.shellTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6 lg:space-y-8">
                <PageHero
                    eyebrow={t("managerWorkspace.decisionLogPage.heroEyebrow")}
                    title={t("managerWorkspace.decisionLogPage.heroTitle")}
                    subtitle={t("managerWorkspace.decisionLogPage.heroSubtitle")}
                    badge={t("workspaceRoles.manager")}
                />

                <section className="relative overflow-hidden rounded-2xl border border-secondary bg-primary p-5 shadow-sm lg:p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-secondary/10 blur-3xl" aria-hidden />
                    <p className="text-sm leading-relaxed text-secondary md:text-base">{executiveBrief}</p>
                    {!isLoading && decisions.length > 0 ? (
                        <dl className="mt-4 flex flex-wrap gap-3 text-xs text-tertiary">
                            <div className="rounded-xl border border-secondary bg-primary_alt px-3 py-2">
                                <dt className="font-semibold text-primary">Total</dt>
                                <dd>{data?.count ?? decisions.length}</dd>
                            </div>
                            <div className="rounded-xl border border-secondary bg-primary_alt px-3 py-2">
                                <dt className="font-semibold text-primary">Dominante</dt>
                                <dd className="capitalize">{bucketLabel(dominantBucket)}</dd>
                            </div>
                            <div className="rounded-xl border border-secondary bg-primary_alt px-3 py-2">
                                <dt className="font-semibold text-primary">Confiance moy.</dt>
                                <dd>{avgConfidence != null ? `${avgConfidence} %` : "—"}</dd>
                            </div>
                            <div className="rounded-xl border border-secondary bg-primary_alt px-3 py-2">
                                <dt className="font-semibold text-primary">Score moy.</dt>
                                <dd>{avgScore != null ? `${avgScore.toFixed(1)} / 10` : "—"}</dd>
                            </div>
                            {trendPhrase ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                    <dt className="font-semibold">Tendance</dt>
                                    <dd>{trendPhrase}</dd>
                                </div>
                            ) : null}
                        </dl>
                    ) : null}
                </section>

                {/* KPI */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <KpiCard
                        label="Total"
                        value={data?.count ?? 0}
                        hint="Décisions enregistrées"
                        tone="brand"
                        active={filterDecision === "all" && !heatmapFilter}
                        trend={recentCount ? `${recentCount} sur 7 j.` : undefined}
                        onClick={() => {
                            setFilterDecision("all");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Continue")}
                        value={counts.Continue ?? bucketCounts.Continue}
                        hint="Cap maintenu"
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
                        hint="Arbitrage"
                        tone="warn"
                        active={filterDecision === "Adjust"}
                        sub={`${adjustStopShare}% ${bucketLabel("Stop")}+${bucketLabel("Adjust")}`}
                        onClick={() => {
                            setFilterDecision("Adjust");
                            clearHeatmap();
                        }}
                    />
                    <KpiCard
                        label={bucketLabel("Stop")}
                        value={counts.Stop ?? bucketCounts.Stop}
                        hint="Freinage"
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
                        hint={t("managerWorkspace.decisionLogPage.kpiHintProceedReject")}
                        tone="neutral"
                        active={filterDecision === "other"}
                        onClick={() => {
                            setFilterDecision("other");
                            clearHeatmap();
                        }}
                    />
                </section>

                <section className="grid gap-3 sm:grid-cols-3">
                    <MiniMetric label="Confiance moyenne" value={avgConfidence != null ? `${avgConfidence} %` : "—"} bar={avgConfidence} />
                    <MiniMetric label="Score moyen" value={avgScore != null ? `${avgScore.toFixed(1)} / 10` : "—"} bar={avgScore != null ? avgScore * 10 : null} />
                    <MiniMetric
                        label="Pression ajustement / Stop"
                        value={`${adjustStopShare} %`}
                        bar={adjustStopShare}
                        hint="Part des décisions Adjust ou Stop"
                    />
                </section>

                {/* Filtres */}
                <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span className="text-xs font-medium text-tertiary">Projet</span>
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                        >
                            <option value="all">Tous les projets</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        {heatmapFilter || filterDecision !== "all" || filterProject !== "all" ? (
                            <button
                                type="button"
                                className="shrink-0 rounded-lg border border-secondary px-3 py-2 text-xs font-semibold text-brand-secondary hover:bg-secondary_subtle"
                                onClick={() => {
                                    setFilterDecision("all");
                                    setFilterProject("all");
                                    clearHeatmap();
                                }}
                            >
                                Effacer filtres
                            </button>
                        ) : null}
                    </div>
                    {heatmapFilter ? (
                        <p className="mt-2 text-xs text-tertiary">
                            Filtre heatmap : {heatmapFilter.bucket === "Other" ? "Autre" : heatmapFilter.bucket} · {BAND_LABELS[heatmapFilter.band]}
                        </p>
                    ) : null}
                </section>

                {isLoading ? <p className="text-sm text-tertiary">Chargement…</p> : null}
                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                        Impossible de charger le journal des décisions.
                    </div>
                ) : null}

                {!isLoading && !error ? (
                    <>
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Spotlight */}
                            <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                                <h2 className="text-sm font-semibold text-primary">Décision à surveiller</h2>
                                {spotlight ? (
                                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/25">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(spotlight.decision))}>
                                                {spotlight.decision}
                                            </span>
                                            <span className="truncate font-medium text-primary">{spotlight.project_name ?? "Sans projet"}</span>
                                        </div>
                                        <dl className="mt-3 grid gap-2 text-xs">
                                            <div className="flex justify-between gap-2">
                                                <dt className="text-tertiary">Score</dt>
                                                <dd className="font-semibold text-primary">{scoreDisplay(spotlight.score)}</dd>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <dt className="text-tertiary">Confiance</dt>
                                                <dd className="font-semibold text-primary">{confidencePercent(spotlight.confidence)} %</dd>
                                            </div>
                                        </dl>
                                        <p className="mt-2 line-clamp-3 text-sm text-secondary">{shortBusinessSummary(spotlight)}</p>
                                        <p className="mt-2 text-[11px] font-medium text-brand-secondary">{recommendedAction(spotlight)}</p>
                                        <DecisionLifecycle decision={spotlight} compact />
                                        <button
                                            type="button"
                                            className="mt-4 w-full rounded-lg border border-brand-secondary/50 bg-brand-primary/10 py-2 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20"
                                            onClick={() => openDrawer(spotlight)}
                                        >
                                            Voir détail
                                        </button>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-tertiary">Aucune décision à mettre en avant.</p>
                                )}
                            </section>

                            {/* Analytics */}
                            <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                                <h2 className="text-sm font-semibold text-primary">Tableau analytique</h2>
                                <p className="mt-1 text-xs text-tertiary">Répartition et motifs détectés dans les libellés existants.</p>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase text-tertiary">Par décision</p>
                                        <div className="mt-2 space-y-2">
                                            {(DECISION_KEYS as readonly DecisionBucket[]).map((k) => {
                                                const n = displayCountForBucket(counts, bucketCounts, otherCount, k);
                                                const max = Math.max(1, decisions.length);
                                                const pct = Math.min(100, Math.round((n / max) * 100));
                                                return (
                                                    <div key={k}>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-secondary">{k === "Other" ? "Autre" : k}</span>
                                                            <span className="tabular-nums text-tertiary">{n}</span>
                                                        </div>
                                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                                                            <div className="h-full rounded-full bg-brand-secondary/80" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase text-tertiary">Motifs fréquents</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {motifCounts.length ? (
                                                motifCounts.map(([key, n]) => (
                                                    <span key={key} className="rounded-full border border-secondary bg-primary_alt px-2 py-0.5 text-[11px] text-secondary">
                                                        {MOTIF_LABELS[key] ?? key} · {n}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-tertiary">Aucun motif récurrent détecté dans les textes.</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase text-tertiary">Projets les plus impactés</p>
                                        <ul className="mt-2 space-y-1.5 text-xs">
                                            {projectImpact.length ? (
                                                projectImpact.map((p) => (
                                                    <li key={p.id} className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-2 py-1.5">
                                                        <span className="truncate text-primary">{p.name}</span>
                                                        <span className="shrink-0 tabular-nums text-tertiary">{p.count}</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-tertiary">Pas d’identifiant projet sur ces entrées.</li>
                                            )}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase text-tertiary">Confiance moyenne par type</p>
                                        <div className="mt-2 space-y-1.5 text-xs">
                                            {(DECISION_KEYS as readonly DecisionBucket[]).map((k) => (
                                                <div key={k} className="flex justify-between gap-2">
                                                    <span className="text-secondary">{k === "Other" ? "Autre" : k}</span>
                                                    <span className="tabular-nums text-tertiary">{confidenceByBucket[k] != null ? `${confidenceByBucket[k]} %` : "—"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Heatmap */}
                        <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-semibold text-primary">Heatmap de confiance</h2>
                                    <p className="mt-1 text-xs text-tertiary">Cliquez sur une cellule pour affiner la timeline.</p>
                                </div>
                                {heatmapFilter ? (
                                    <button type="button" className="text-xs font-semibold text-brand-secondary hover:underline" onClick={clearHeatmap}>
                                        Réinitialiser la heatmap
                                    </button>
                                ) : null}
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <div className="inline-block min-w-full rounded-xl border border-secondary">
                                    <div className="grid grid-cols-[minmax(0,6rem)_repeat(3,minmax(0,1fr))] bg-secondary_subtle/40 text-[10px] font-semibold uppercase text-tertiary">
                                        <div className="border-b border-r border-secondary p-2" />
                                        {BAND_LABELS.map((lab) => (
                                            <div key={lab} className="border-b border-r border-secondary p-2 text-center last:border-r-0">
                                                {lab.replace("Confiance ", "")}
                                            </div>
                                        ))}
                                        {(DECISION_KEYS as readonly DecisionBucket[]).map((bucket, row) => (
                                            <Fragment key={bucket}>
                                                <div
                                                    className={cx(
                                                        "flex items-center border-r border-secondary bg-primary px-2 py-2 text-[10px] font-semibold text-secondary",
                                                        row < DECISION_KEYS.length - 1 ? "border-b" : "",
                                                    )}
                                                >
                                                    {bucket === "Other" ? "Autre" : bucket}
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
                                                                "min-h-[3.25rem] border-r p-2 text-center text-sm font-bold tabular-nums transition hover:ring-2 hover:ring-brand-secondary/40",
                                                                row < DECISION_KEYS.length - 1 ? "border-b" : "",
                                                                band === 2 ? "last:border-r-0" : "",
                                                                heatmapIntensityClass(n, heatmapMatrix.max),
                                                                active && "ring-2 ring-brand-secondary ring-offset-2 ring-offset-primary",
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

                        {/* Timeline */}
                        <section>
                            <h2 className="text-sm font-semibold text-primary">Timeline décisions</h2>
                            <p className="mt-0.5 text-xs text-tertiary">
                                {filteredDecisions.length} affichée{filteredDecisions.length > 1 ? "s" : ""}
                                {filteredDecisions.length !== decisions.length ? ` sur ${decisions.length}` : ""}
                            </p>
                            {!filteredDecisions.length ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-secondary px-6 py-12 text-center text-sm text-tertiary">
                                    Aucune décision pour ces filtres.
                                </div>
                            ) : (
                                <div className="relative mt-6 space-y-10 pl-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-secondary">
                                    {PERIOD_ORDER.map(({ key, title }) => {
                                        const items = timelineGroups[key];
                                        if (!items.length) return null;
                                        return (
                                            <div key={key}>
                                                <div className="relative flex items-center gap-2">
                                                    <span className="absolute -left-4 size-2 rounded-full bg-brand-secondary" aria-hidden />
                                                    <h3 className="text-xs font-bold uppercase tracking-wide text-tertiary">{title}</h3>
                                                </div>
                                                <ul className="mt-3 space-y-3">
                                                    {items.map((d) => (
                                                        <li key={d.id}>
                                                            <article className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm transition hover:border-brand-secondary/30">
                                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(d.decision))}>
                                                                                {d.decision}
                                                                            </span>
                                                                            <span className="truncate font-medium text-primary">{d.project_name ?? "Sans projet"}</span>
                                                                        </div>
                                                                        <p className="mt-1 text-[11px] text-tertiary">
                                                                            {d.scope ? `Source : ${d.scope}` : null}
                                                                            {d.scope ? " · " : null}
                                                                            {timeAgo(d.created_at)}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-secondary">
                                                                            Score {scoreDisplay(d.score)} · Confiance {confidencePercent(d.confidence)} %
                                                                        </p>
                                                                        {detectMotif(d.reason ?? "") ? (
                                                                            <span className="mt-1 inline-block rounded-full border border-secondary bg-primary_alt px-2 py-0.5 text-[10px] text-tertiary">
                                                                                {MOTIF_LABELS[detectMotif(d.reason ?? "")!] ?? detectMotif(d.reason ?? "")}
                                                                            </span>
                                                                        ) : null}
                                                                        <p className="mt-2 line-clamp-2 text-sm text-secondary">{shortBusinessSummary(d)}</p>
                                                                        <div className="mt-2 max-w-md">
                                                                            <ConfidenceBar value={d.confidence} />
                                                                        </div>
                                                                        <DecisionLifecycle decision={d} compact />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="shrink-0 rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20"
                                                                        onClick={() => openDrawer(d)}
                                                                    >
                                                                        Voir détail
                                                                    </button>
                                                                </div>
                                                            </article>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
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
    hint,
    tone,
    active,
    sub,
    trend,
    onClick,
}: {
    label: string;
    value: number;
    hint: string;
    tone: "brand" | "safe" | "warn" | "danger" | "neutral";
    active?: boolean;
    sub?: string;
    trend?: string;
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
                "rounded-2xl border bg-primary p-4 text-left shadow-sm ring-1 transition hover:border-brand-secondary/30",
                ring,
                active ? "border-brand-secondary bg-brand-primary/5" : "border-secondary",
            )}
        >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{value}</p>
            <p className="mt-1 text-[11px] text-tertiary">{hint}</p>
            {sub ? <p className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-200">{sub}</p> : null}
            {trend ? <p className="mt-1 text-[10px] text-brand-secondary">{trend}</p> : null}
        </button>
    );
}

function MiniMetric({ label, value, bar, hint }: { label: string; value: string; bar: number | null; hint?: string }) {
    const pct = bar == null || !Number.isFinite(bar) ? 0 : Math.min(100, Math.max(0, bar));
    return (
        <article className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/15">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-primary">{value}</p>
            {hint ? <p className="mt-0.5 text-[10px] text-tertiary">{hint}</p> : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brand-secondary/70 transition-all" style={{ width: `${pct}%` }} />
            </div>
        </article>
    );
}

function ConfidenceBar({ value }: { value: number }) {
    const pct = confidencePercent(value);
    const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-secondary">
                <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-secondary">{pct} %</span>
        </div>
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

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Fermer" />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col overflow-hidden border-l border-secondary bg-primary shadow-2xl sm:max-w-md">
                <header className="border-b border-secondary px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase text-tertiary">Décision</p>
                            <h2 className="truncate text-lg font-semibold text-primary">{decision.project_name ?? "Sans projet"}</h2>
                            <span className={cx("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(decision.decision))}>
                                {decision.decision}
                            </span>
                        </div>
                        <button type="button" className="rounded-lg border border-secondary px-2 py-1 text-xs font-medium hover:bg-secondary_subtle" onClick={onClose}>
                            Fermer
                        </button>
                    </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <dl className="grid gap-2 text-xs">
                        <Row label="Score" value={scoreDisplay(decision.score)} />
                        <Row label="Confiance" value={`${confidencePercent(decision.confidence)} %`} />
                        <Row label="Source" value={decision.scope || "—"} />
                        <Row label="Horodatage" value={new Date(decision.created_at).toLocaleString("fr-FR")} />
                    </dl>
                    <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase text-tertiary">Synthèse métier</p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            {formatUserFacingExplanation(decision.reason ?? "", {
                                score: Number(decision.score ?? 0),
                                decision: decision.decision,
                            })}
                        </p>
                    </div>
                    <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase text-tertiary">Lifecycle</p>
                        <DecisionLifecycle decision={decision} />
                    </div>
                    {decision.payload && Object.keys(decision.payload).length > 0 ? (
                        <p className="mt-4 text-xs text-tertiary">Données d’analyse complémentaires disponibles côté système (non détaillées ici).</p>
                    ) : null}
                </div>
                <footer className="border-t border-secondary px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {pid ? (
                            <Link
                                to={managerProjectsOpenModalPath(pid)}
                                className="rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-2 text-center text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20"
                            >
                                Ouvrir le projet (Mission Control)
                            </Link>
                        ) : null}
                        <button type="button" className="rounded-lg border border-secondary px-3 py-2 text-xs font-medium hover:bg-secondary_subtle" onClick={() => void copy()}>
                            Copier le résumé
                        </button>
                    </div>
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
