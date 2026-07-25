import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, History, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { DecisionGroupSlideOver } from "@/components/decision-log/DecisionGroupSlideOver";
import { MiniScoreGauge } from "@/components/decision-log/MiniScoreGauge";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import {
    TRIAGE_SEGMENTED,
    TRIAGE_SEGMENT_ACTIVE,
    TRIAGE_SEGMENT_IDLE,
} from "@/components/manager/inbox-triage/triage-ui";
import {
    applyDecisionStatusInManagerLogCache,
    managerDecisionLogQueryKeys,
    useManagerDecisionLog,
    type ManagerDecisionLogFilters,
} from "@/hooks/useManagerDecisionLog";
import {
    computeClientStats,
    countGroupsByDecisionType,
    DECISION_BADGE_CLASS,
    DECISION_DOT_CLASS,
    DECISION_TYPE_FILTERS,
    emptyStateForType,
    filterGroupsByDecisionType,
    formatDecisionTime,
    groupDecisions,
    lowestScoreGroup,
    partitionGroupsByDay,
    SCOPE_LABELS,
    type DecisionTypeFilter,
    type ManagerDecisionGroup,
} from "@/lib/manager-decision-log-inbox";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useToast } from "@/providers/toast-provider";
import {
    decisionsApi,
    type DecisionLogPeriod,
    type DecisionLogStatus,
    type DecisionStatusAction,
    type ManagerDecisionLogResponse,
} from "@/services/decisions.api";
import { cx } from "@/utils/cx";

const PERIOD_FILTERS: { id: DecisionLogPeriod; label: string }[] = [
    { id: "7d", label: "7 j" },
    { id: "30d", label: "30 j" },
    { id: "90d", label: "90 j" },
    { id: "all", label: "Tout" },
];

function TimelineSkeleton() {
    return (
        <ul className="space-y-0" aria-busy="true" aria-label="Chargement du journal">
            {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="relative flex gap-3 py-3 pl-1">
                    <span className="mt-1.5 size-2.5 shrink-0 animate-pulse rounded-full bg-secondary" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-2/5 max-w-[160px] animate-pulse rounded bg-secondary" />
                        <div className="h-3 w-4/5 max-w-[320px] animate-pulse rounded bg-secondary" />
                        <div className="h-2.5 w-1/4 max-w-[100px] animate-pulse rounded bg-secondary" />
                    </div>
                    <div className="h-2.5 w-10 animate-pulse rounded bg-secondary" />
                </li>
            ))}
        </ul>
    );
}

function CompactStatsBar({
    stats,
}: {
    stats: ReturnType<typeof computeClientStats>;
}) {
    const total = Math.max(1, stats.total);
    const segments = [
        { key: "continue", value: stats.continue, className: "bg-emerald-500", label: "Continue" },
        { key: "adjust", value: stats.adjust, className: "bg-amber-500", label: "Adjust" },
        { key: "stop", value: stats.stop, className: "bg-rose-500", label: "Stop" },
    ] as const;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-secondary bg-primary px-3.5 py-2.5 text-xs">
            <div>
                <span className="text-tertiary">Total</span>{" "}
                <strong className="tabular-nums text-primary">{stats.total}</strong>
            </div>
            <div className="flex min-w-[8rem] flex-1 items-center gap-2">
                <div
                    className="flex h-1.5 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-secondary_subtle"
                    role="img"
                    aria-label={`Répartition Continue ${stats.continue}, Adjust ${stats.adjust}, Stop ${stats.stop}`}
                >
                    {segments.map((s) => {
                        const w = (s.value / total) * 100;
                        if (w <= 0) return null;
                        return (
                            <span
                                key={s.key}
                                className={cx(s.className, "h-full")}
                                style={{ width: `${w}%` }}
                                title={`${s.label}: ${s.value}`}
                            />
                        );
                    })}
                </div>
                <span className="shrink-0 tabular-nums text-tertiary">
                    <span className="text-emerald-600">{stats.continue}</span>
                    <span aria-hidden> · </span>
                    <span className="text-amber-600">{stats.adjust}</span>
                    <span aria-hidden> · </span>
                    <span className="text-rose-600">{stats.stop}</span>
                </span>
            </div>
            <div>
                <span className="text-tertiary">Score moyen</span>{" "}
                <strong className="tabular-nums text-primary">
                    {stats.avgScore != null ? `${stats.avgScore.toFixed(2)}/10` : "—"}
                </strong>
            </div>
        </div>
    );
}

type TimelineRowProps = {
    group: ManagerDecisionGroup;
    onOpen: (group: ManagerDecisionGroup) => void;
};

function TimelineRow({ group, onOpen }: TimelineRowProps) {
    const agent = SCOPE_LABELS[group.scope] ?? group.scope;
    const time = formatDecisionTime(group.latest_at);
    const isHandled = group.status === "handled" || group.status === "dismissed";
    const summary = group.parsed.summary.trim();

    return (
        <li className="relative">
            <button
                type="button"
                onClick={() => onOpen(group)}
                className={cx(
                    "group relative flex w-full gap-3 rounded-lg py-2.5 pl-1 pr-2 text-left transition",
                    "hover:bg-secondary_subtle/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1",
                    isHandled && "opacity-60",
                )}
                aria-label={`${group.decisionLabel}, ${group.project_name ?? "projet"}, score ${Number(group.score).toFixed(2)}`}
            >
                <span className="relative z-[1] mt-1.5 flex shrink-0 flex-col items-center">
                    <span
                        className={cx("size-2.5 rounded-full ring-2 ring-primary", DECISION_DOT_CLASS[group.decision])}
                        aria-hidden
                    />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span
                            className={cx(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                DECISION_BADGE_CLASS[group.decision],
                            )}
                        >
                            {group.decisionLabel}
                        </span>
                        {group.count > 1 ? (
                            <span className="rounded bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-tertiary">
                                ×{group.count}
                            </span>
                        ) : null}
                        <span className="truncate text-sm font-semibold text-primary">
                            {group.project_name?.trim() || "Projet sans nom"}
                        </span>
                        <MiniScoreGauge score={group.score} className="ml-auto sm:ml-0" />
                    </span>

                    {summary ? (
                        <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-secondary">{summary}</span>
                    ) : null}

                    {group.parsed.hasParsingIssue && !summary.includes("Synthèse IA indisponible") ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100">
                            Synthèse IA indisponible — score déterministe utilisé
                        </span>
                    ) : null}

                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-tertiary">
                        <span>{agent}</span>
                        {group.confidence != null ? (
                            <>
                                <span aria-hidden>·</span>
                                <span>Confiance {group.confidence}%</span>
                            </>
                        ) : null}
                        {isHandled ? (
                            <>
                                <span aria-hidden>·</span>
                                <span>{group.status === "handled" ? "Validée" : "Rejetée"}</span>
                            </>
                        ) : null}
                    </span>
                </span>

                <time
                    dateTime={group.latest_at}
                    className="mt-1 shrink-0 text-[11px] tabular-nums text-tertiary"
                >
                    {time}
                </time>
            </button>
        </li>
    );
}

export default function ManagerDecisionLogPage() {
    useWorkspaceTopbarMeta(
        "Journal des décisions IA",
        "Traçabilité des décisions agents — journal d'audit",
    );

    const qc = useQueryClient();
    const { push: showToast } = useToast();

    const [period, setPeriod] = useState<DecisionLogPeriod>("30d");
    const [typeFilter, setTypeFilter] = useState<DecisionTypeFilter>("all");
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const logFilters = useMemo<ManagerDecisionLogFilters>(
        () => ({ period }),
        [period],
    );

    const { data: log, isLoading, isFetching, refetch, isError } = useManagerDecisionLog(logFilters);
    const decisions = log?.decisions ?? [];

    const groups = useMemo(() => groupDecisions(decisions), [decisions]);
    const typeCounts = useMemo(() => countGroupsByDecisionType(groups), [groups]);
    const filteredGroups = useMemo(
        () => filterGroupsByDecisionType(groups, typeFilter),
        [groups, typeFilter],
    );
    const stats = useMemo(() => computeClientStats(filteredGroups), [filteredGroups]);
    const daySections = useMemo(() => partitionGroupsByDay(filteredGroups), [filteredGroups]);
    const watchGroup = useMemo(() => lowestScoreGroup(filteredGroups), [filteredGroups]);

    const selectedGroup = useMemo(
        () => (selectedKey ? (groups.find((g) => g.key === selectedKey) ?? null) : null),
        [groups, selectedKey],
    );

    const emptyCopy = emptyStateForType(typeFilter);

    const reload = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const handleMark = useCallback(
        async (decisionId: string, action: DecisionStatusAction) => {
            setActioningId(decisionId);
            const nextStatus: DecisionLogStatus =
                action === "handled" ? "handled" : action === "dismissed" ? "dismissed" : "open";
            const previous = qc.getQueryData<ManagerDecisionLogResponse>(
                managerDecisionLogQueryKeys.log(logFilters),
            );
            applyDecisionStatusInManagerLogCache(
                qc,
                logFilters,
                decisionId,
                nextStatus,
                nextStatus === "open" ? null : new Date().toISOString(),
            );

            try {
                const res = await decisionsApi.markManagerDecisionHandled(decisionId, action);
                if (res?.success) {
                    const status: DecisionLogStatus =
                        res.status ?? nextStatus;
                    applyDecisionStatusInManagerLogCache(qc, logFilters, decisionId, status, res.handled_at);
                } else {
                    if (previous) {
                        qc.setQueryData(managerDecisionLogQueryKeys.log(logFilters), previous);
                    }
                    showToast(res?.message ?? "Erreur de mise à jour", "error");
                }
            } catch (err) {
                if (previous) {
                    qc.setQueryData(managerDecisionLogQueryKeys.log(logFilters), previous);
                }
                const msg = isAxiosError(err)
                    ? String((err.response?.data as { message?: string })?.message ?? err.message)
                    : "Erreur de mise à jour";
                showToast(msg, "error");
            } finally {
                setActioningId(null);
            }
        },
        [logFilters, qc, showToast],
    );

    const isEmpty = !isLoading && !isError && filteredGroups.length === 0;

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-tertiary">
                        {groups.length} groupe{groups.length !== 1 ? "s" : ""}
                        {groups.length !== decisions.length
                            ? ` · ${decisions.length} occurrence${decisions.length !== 1 ? "s" : ""}`
                            : null}
                    </p>
                    <button
                        type="button"
                        onClick={() => void reload()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3 py-1.5 text-xs text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60"
                    >
                        <RefreshCw size={12} className={isFetching ? "animate-spin" : undefined} aria-hidden />
                        Actualiser
                    </button>
                </div>

                {!isLoading && groups.length > 0 ? <CompactStatsBar stats={stats} /> : null}

                {watchGroup ? (
                    <div className="flex shrink-0 items-start gap-2.5 rounded-lg border border-secondary border-l-[3px] border-l-amber-500 bg-primary px-3 py-2">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-primary">
                                À surveiller — {watchGroup.project_name || "Projet"} · Score{" "}
                                {Number(watchGroup.score).toFixed(2)}/10
                                {watchGroup.confidence != null ? ` · Confiance ${watchGroup.confidence}%` : ""}
                            </p>
                            {watchGroup.parsed.summary ? (
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-tertiary">
                                    {watchGroup.parsed.summary}
                                </p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedKey(watchGroup.key)}
                            className="shrink-0 text-[11px] font-medium text-amber-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-amber-300"
                        >
                            Voir
                        </button>
                    </div>
                ) : null}

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className={TRIAGE_SEGMENTED} role="group" aria-label="Période">
                        {PERIOD_FILTERS.map((p) => {
                            const active = period === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setPeriod(p.id)}
                                    className={cx(
                                        "rounded px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                                        active ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                                    )}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className={TRIAGE_SEGMENTED} role="tablist" aria-label="Type de décision">
                        {DECISION_TYPE_FILTERS.map((t) => {
                            const active = typeFilter === t.id;
                            const count = typeCounts[t.id];
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setTypeFilter(t.id)}
                                    className={cx(
                                        "rounded px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                                        active ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                                    )}
                                >
                                    {t.label}
                                    <span className="ml-1 tabular-nums opacity-60">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-[12rem] overflow-hidden rounded-xl border border-secondary bg-primary px-3 py-2 sm:px-4">
                    {isLoading ? <TimelineSkeleton /> : null}

                    {isError ? (
                        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-rose-800 dark:text-rose-200">
                            <p>Impossible de charger le journal.</p>
                            <button
                                type="button"
                                onClick={() => void reload()}
                                className="text-xs font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : null}

                    {isEmpty ? (
                        <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 py-10 text-center text-tertiary">
                            <History className="mb-2.5 size-9 text-slate-400" aria-hidden />
                            <p className="text-sm font-medium text-secondary">{emptyCopy.title}</p>
                            <p className="mt-1 text-xs">{emptyCopy.description}</p>
                        </div>
                    ) : null}

                    {!isLoading && !isError && !isEmpty
                        ? daySections.map((section) => (
                              <section key={section.dayKey} className="mb-1 last:mb-0">
                                  <h3 className="sticky top-0 z-10 -mx-3 border-b border-secondary bg-primary/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-tertiary backdrop-blur sm:-mx-4 sm:px-4">
                                      {section.label}
                                      <span className="ml-1.5 font-normal tabular-nums opacity-70">
                                          ({section.groups.length})
                                      </span>
                                  </h3>
                                  <div className="relative">
                                      <span
                                          className="absolute bottom-2 left-[0.4375rem] top-2 w-px bg-secondary"
                                          aria-hidden
                                      />
                                      <ul>
                                          {section.groups.map((group) => (
                                              <TimelineRow
                                                  key={group.key}
                                                  group={group}
                                                  onOpen={(g) => setSelectedKey(g.key)}
                                              />
                                          ))}
                                      </ul>
                                  </div>
                              </section>
                          ))
                        : null}
                </div>
            </div>

            <DecisionGroupSlideOver
                group={selectedGroup}
                actioning={Boolean(actioningId)}
                onClose={() => setSelectedKey(null)}
                onMark={(id, action) => void handleMark(id, action)}
            />
        </WorkspacePageShell>
    );
}
