import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    buildExecutiveRecommendations,
    buildSkillGapsSorted,
    looksLikeUuidOrTechnicalId,
    stripTechnicalIdentifiers,
    type MatchmakerRecommendationRow,
    type MatchmakerSkillGapRow,
} from "@/lib/matchmaker-display";
import {
    formatMatchmakerScore10,
    formatMatchmakerScoreCompact,
    formatMatchmakerStatDisplay,
    MANAGER_DASHBOARD_SECTION_IDS,
} from "@/lib/manager-dashboard-display";
import { useManagerMatchmaker } from "@/hooks/use-manager-matchmaker";
import { useAuth } from "@/providers/auth-provider";

const MATCHMAKER_COLUMN_SCROLL_CLASS = "max-h-[520px] overflow-y-auto";
const TALENTS_PREVIEW_PER_PROJECT = 3;

function readMatchmakerNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function readStr(o: Record<string, unknown>, k: string): string {
    const v = o[k];
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

type TalentByProjectGroup = {
    key: string;
    projectName: string;
    talents: Array<{ name: string; overall: number | null; skillFit: number | null }>;
};

function buildTalentGroupsByProject(items: unknown[], limit = 5): TalentByProjectGroup[] {
    const map = new Map<string, { projectName: string; talents: TalentByProjectGroup["talents"] }>();

    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const projectIdRaw = readStr(o, "project_id") || readStr(o, "projectId");
        const projectName = readStr(o, "project_name") || "—";
        const key = projectIdRaw ? `id:${projectIdRaw}` : `name:${projectName}`;

        let name = readStr(o, "talent_name") || readStr(o, "name") || readStr(o, "talent");
        name = stripTechnicalIdentifiers(name);
        if (!name || looksLikeUuidOrTechnicalId(name)) continue;

        if (!map.has(key)) map.set(key, { projectName, talents: [] });
        map.get(key)!.talents.push({
            name,
            overall: readMatchmakerNumber(o.overall_score ?? o.score),
            skillFit: readMatchmakerNumber(o.skill_fit_score ?? o.skills_fit_score),
        });
    }

    return [...map.entries()]
        .map(([k, v]) => ({
            key: k,
            projectName: stripTechnicalIdentifiers(v.projectName) || "—",
            talents: [...v.talents].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1)),
        }))
        .sort((a, b) => b.talents.length - a.talents.length || a.projectName.localeCompare(b.projectName, "fr"))
        .slice(0, limit);
}

function averageOverallScore(talents: TalentByProjectGroup["talents"]): number | null {
    const scores = talents.map((t) => t.overall).filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function MatchmakerColumnShell({
    title,
    showEmpty,
    emptyLabel,
    children,
}: {
    title: string;
    showEmpty: boolean;
    emptyLabel: string;
    children: React.ReactNode;
}) {
    return (
        <article className="flex max-h-[520px] min-h-0 flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="shrink-0 border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className="shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                        Matchmaker
                    </span>
                </div>
            </div>
            <div className={`min-h-0 flex-1 p-4 ${MATCHMAKER_COLUMN_SCROLL_CLASS}`}>
                {showEmpty ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
                        <p className="max-w-xs text-sm leading-relaxed text-tertiary">{emptyLabel}</p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </article>
    );
}

function MatchmakerMiniKpiCard({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-xl border border-secondary/90 bg-primary px-4 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
        </article>
    );
}

function matchmakerExecutiveBorderClass(rank: number): string {
    if (rank >= 4) return "border-l-[3px] border-l-red-500 pl-3.5";
    if (rank >= 3) return "border-l-[3px] border-l-orange-500 pl-3.5";
    if (rank >= 2) return "border-l-[3px] border-l-amber-500 pl-3.5";
    if (rank >= 1) return "border-l-[3px] border-l-emerald-600/80 pl-3.5";
    return "border-l-[3px] border-l-gray-300 pl-3.5 dark:border-l-gray-600";
}

function matchmakerExecutiveBadgeClass(rank: number): string {
    if (rank >= 4) return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    if (rank >= 3) return "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (rank >= 2) return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    if (rank >= 1) return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
    return "border-secondary bg-secondary_subtle text-secondary";
}

function matchmakerPriorityLabelForRow(
    row: MatchmakerRecommendationRow,
    t: (key: string) => string,
): string {
    const raw = row.priorityRaw?.trim() ?? "";
    if (raw && !looksLikeUuidOrTechnicalId(raw) && raw.length <= 36) return raw;
    const r = row.severityRank;
    if (r >= 4) return t("managerWorkspace.commonSeverity.critical");
    if (r >= 3) return t("managerWorkspace.commonSeverity.high");
    if (r >= 2) return t("managerWorkspace.commonSeverity.medium");
    if (r >= 1) return t("managerWorkspace.commonSeverity.low");
    return t("managerWorkspace.dashboard.matchmakerPriorityUnspecified");
}

function MatchmakerRecommendationsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const rows = useMemo(() => buildExecutiveRecommendations(items, 5), [items]);
    const showEmpty = items.length === 0 || rows.length === 0;

    return (
        <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
            <ul className="space-y-3">
                {rows.map((row) => (
                    <li
                        key={row.key}
                        className={`rounded-xl border border-secondary/70 bg-primary_alt/70 py-3 pr-3 dark:bg-secondary_subtle/25 ${matchmakerExecutiveBorderClass(row.severityRank)}`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-primary" title={row.projectName}>
                                {row.projectName}
                            </p>
                            <span
                                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${matchmakerExecutiveBadgeClass(row.severityRank)}`}
                            >
                                {matchmakerPriorityLabelForRow(row, t)}
                            </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-secondary" title={row.actionSummary}>
                            {row.actionSummary}
                        </p>
                    </li>
                ))}
            </ul>
        </MatchmakerColumnShell>
    );
}

type ProjectTalentsDrawerState = {
    projectName: string;
    talents: TalentByProjectGroup["talents"];
} | null;

function MatchmakerTalentsByProjectBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const [drawer, setDrawer] = useState<ProjectTalentsDrawerState>(null);
    const groups = useMemo(() => buildTalentGroupsByProject(items, 5), [items]);
    const showEmpty = items.length === 0 || groups.length === 0;

    return (
        <>
            <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
                <ul className="space-y-3">
                    {groups.map((g) => {
                        const preview = g.talents.slice(0, TALENTS_PREVIEW_PER_PROJECT);
                        const extra = g.talents.length - preview.length;
                        const avg = averageOverallScore(g.talents);

                        return (
                            <li
                                key={g.key}
                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-indigo-600 bg-primary_alt/70 py-3 pl-4 pr-3 dark:bg-secondary_subtle/25"
                            >
                                <p className="truncate text-sm font-semibold leading-snug text-primary" title={g.projectName}>
                                    {g.projectName}
                                </p>
                                <p className="mt-1 text-[11px] tabular-nums text-tertiary">
                                    {t("managerWorkspace.dashboard.matchmakerProjectAvgScore", {
                                        score: formatMatchmakerScore10(avg),
                                    })}
                                </p>
                                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                    {t("managerWorkspace.dashboard.matchmakerTopCandidates")}
                                </p>
                                <ul className="mt-1 list-inside list-disc space-y-0.5 pl-0.5">
                                    {preview.map((talent) => (
                                        <li
                                            key={`${g.key}-${talent.name}`}
                                            className="truncate text-xs text-secondary marker:text-tertiary"
                                            title={`${talent.name} · ${formatMatchmakerScoreCompact(talent.overall)}`}
                                        >
                                            <span className="text-primary">
                                                {t("managerWorkspace.dashboard.matchmakerTalentLine", {
                                                    name: talent.name,
                                                    score: formatMatchmakerScoreCompact(talent.overall),
                                                })}
                                            </span>
                                            {talent.skillFit != null ? (
                                                <span className="text-tertiary">
                                                    {" "}
                                                    ({t("managerWorkspace.dashboard.matchmakerTalentFit", {
                                                        fit: formatMatchmakerScoreCompact(talent.skillFit),
                                                    })})
                                                </span>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                                {extra > 0 ? (
                                    <button
                                        type="button"
                                        className="mt-2 text-xs font-semibold text-brand-secondary hover:underline"
                                        onClick={() => setDrawer({ projectName: g.projectName, talents: g.talents })}
                                    >
                                        {t("managerWorkspace.dashboard.matchmakerViewMoreTalents", { count: extra })}
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </MatchmakerColumnShell>

            {drawer ? (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
                        aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                        onClick={() => setDrawer(null)}
                    />
                    <aside
                        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-secondary bg-primary shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                    >
                        <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Matchmaker</p>
                                <h2 className="mt-1 truncate text-lg font-bold text-primary">
                                    {t("managerWorkspace.dashboard.matchmakerProjectTalentsDrawerTitle", {
                                        project: drawer.projectName,
                                    })}
                                </h2>
                                <p className="mt-1 text-xs tabular-nums text-tertiary">
                                    {t("managerWorkspace.dashboard.analystNineBoxDrawerCount", {
                                        count: drawer.talents.length,
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrawer(null)}
                                className="rounded-lg p-2 text-tertiary hover:bg-secondary_subtle"
                                aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                            >
                                <X className="size-5" />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            <ul className="space-y-2">
                                {drawer.talents.map((talent) => (
                                    <li
                                        key={talent.name}
                                        className="rounded-xl border border-secondary/70 bg-primary_alt/80 px-3 py-2.5 dark:bg-secondary_subtle/25"
                                    >
                                        <p className="truncate text-sm font-medium text-primary" title={talent.name}>
                                            {talent.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs tabular-nums text-tertiary">
                                            <span>{formatMatchmakerScoreCompact(talent.overall)}</span>
                                            {talent.skillFit != null ? (
                                                <span>
                                                    {" "}
                                                    ·{" "}
                                                    {t("managerWorkspace.dashboard.matchmakerTalentFit", {
                                                        fit: formatMatchmakerScoreCompact(talent.skillFit),
                                                    })}
                                                </span>
                                            ) : null}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </>
            ) : null}
        </>
    );
}

function MatchmakerSkillGapsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const rows = useMemo(() => buildSkillGapsSorted(items, 5), [items]);
    const showEmpty = items.length === 0 || rows.length === 0;

    return (
        <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
            <ul className="space-y-3">
                {rows.map((row: MatchmakerSkillGapRow) => (
                    <li
                        key={row.key}
                        className="rounded-xl border border-secondary/70 border-l-[3px] border-l-amber-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-primary" title={row.title}>
                                {row.title}
                            </p>
                            {row.occurrenceCount > 0 ? (
                                <span className="shrink-0 rounded-full border border-secondary bg-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-secondary">
                                    {t("managerWorkspace.dashboard.matchmakerOccurrencesBadge", {
                                        count: row.occurrenceCount,
                                    })}
                                </span>
                            ) : null}
                        </div>
                        {row.subtitle ? (
                            <p className="mt-1.5 truncate text-xs leading-relaxed text-tertiary" title={row.subtitle}>
                                {row.subtitle}
                            </p>
                        ) : null}
                    </li>
                ))}
            </ul>
        </MatchmakerColumnShell>
    );
}

function MatchmakerSectionSkeleton() {
    return (
        <div className="animate-pulse space-y-5" aria-busy="true">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[72px] rounded-xl bg-secondary_subtle/80 dark:bg-secondary_subtle/30" />
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[520px] rounded-2xl bg-secondary_subtle/60 dark:bg-secondary_subtle/25" />
                ))}
            </div>
        </div>
    );
}

export function MatchmakerSection() {
    const { t } = useTranslation("common");
    const { user } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { matchmaker, isLoading, isError, refetchAll, hasContext } = useManagerMatchmaker(
        user?.id,
        user?.enterpriseId,
    );

    const stats = matchmaker?.stats;
    const topRecommendations = matchmaker?.top_recommendations ?? [];
    const topUnassignedMatches = matchmaker?.top_unassigned_matches ?? [];
    const topSkillGaps = matchmaker?.top_skill_gaps ?? [];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchAll();
        } finally {
            setIsRefreshing(false);
        }
    };

    const hasData =
        (stats?.projects_with_matching ?? 0) > 0 ||
        topRecommendations.length > 0 ||
        topUnassignedMatches.length > 0 ||
        topSkillGaps.length > 0;

    return (
        <section
            id={MANAGER_DASHBOARD_SECTION_IDS.matchmaker}
            className="scroll-mt-24 space-y-5 rounded-2xl border border-secondary bg-primary p-5 shadow-sm"
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-primary">{t("managerWorkspace.dashboard.matchmakerTitle")}</h3>
                        <span className="rounded-full border border-brand-secondary/40 bg-brand-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-brand-secondary">
                            Matchmaker
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-secondary">{t("managerWorkspace.dashboard.matchmakerSubtitle")}</p>
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
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.matchmakerEmpty")}</p>
                </div>
            ) : isLoading ? (
                <MatchmakerSectionSkeleton />
            ) : isError ? (
                <div
                    role="alert"
                    className="rounded-xl border border-error-secondary/40 bg-error-primary/10 px-4 py-6 text-center text-sm text-error-primary"
                >
                    Impossible de charger les données Matchmaker.
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.matchmakerEmpty")}</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiProjects")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.projects_with_matching))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiAvgScore")}
                            value={formatMatchmakerScore10(readMatchmakerNumber(stats?.avg_match_score))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiGaps")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.total_gaps))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiRecruitment")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.recruitment_needed))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiTraining")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.training_needed))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiRedeploy")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.redeploy_possible), {
                                capOver100: true,
                            })}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                        <MatchmakerRecommendationsBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockRecommendations")}
                            items={topRecommendations}
                            emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptyRecommendations")}
                        />
                        <MatchmakerTalentsByProjectBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockUnassigned")}
                            items={topUnassignedMatches}
                            emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptyUnassigned")}
                        />
                        <MatchmakerSkillGapsBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockSkillGaps")}
                            items={topSkillGaps}
                            emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptySkillGaps")}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
