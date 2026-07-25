import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertGroupDrawer } from "@/components/manager/risks/AlertGroupDrawer";
import { AlertInboxRow } from "@/components/manager/risks/AlertInboxRow";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { managerNotificationsApi } from "@/api/manager-notifications.api";
import {
    managerNotificationsQueryKeys,
    useManagerNotificationsList,
} from "@/hooks/use-manager-notifications-bell";
import { isManagerNotificationUnread } from "@/lib/manager-notifications-normalize";
import {
    countGroupsBySegment,
    emptyStateMessage,
    filterAlertGroups,
    groupAlerts,
    INBOX_PERIODS,
    INBOX_SECTION_LABELS,
    INBOX_SECTION_ORDER,
    INBOX_SEGMENTS,
    partitionGroupsBySection,
    unreadOccurrenceIds,
    type AlertInboxPeriod,
    type AlertInboxSegment,
    type AlertInboxTimeSection,
    type ManagerAlertGroup,
} from "@/lib/manager-alerts-inbox";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useToast } from "@/providers/toast-provider";
import type { ManagerNotification } from "@/types/manager-notifications.types";
import { cx } from "@/utils/cx";

const PAGE_SIZE = 25;
const LIST_FILTERS = { time_filter: "all" as const, limit: 100 };

function InboxSkeleton() {
    return (
        <ul className="divide-y divide-secondary" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="flex items-stretch gap-0">
                    <span className="w-1 shrink-0 bg-secondary" />
                    <div className="flex flex-1 items-start gap-3 px-3 py-2.5">
                        <span className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-secondary" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
                            <div className="h-2.5 w-1/3 animate-pulse rounded bg-secondary" />
                        </div>
                        <div className="h-2.5 w-12 animate-pulse rounded bg-secondary" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function RisquesAlertesPage() {
    useWorkspaceTopbarMeta("Risques & Alertes", "Centre de notifications — triage portfolio");

    const qc = useQueryClient();
    const { push: showToast } = useToast();

    const [segment, setSegment] = useState<AlertInboxSegment>("all");
    const [period, setPeriod] = useState<AlertInboxPeriod>("all");
    const [search, setSearch] = useState("");
    const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
    const [olderExpanded, setOlderExpanded] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [ackingKey, setAckingKey] = useState<string | null>(null);
    const [ackingAll, setAckingAll] = useState(false);

    const listQuery = useManagerNotificationsList(LIST_FILTERS);
    const notifications = listQuery.data ?? [];

    const groups = useMemo(() => groupAlerts(notifications), [notifications]);

    const filtered = useMemo(
        () => filterAlertGroups(groups, { segment, period, search }),
        [groups, segment, period, search],
    );

    const segmentCounts = useMemo(
        () =>
            countGroupsBySegment(
                filterAlertGroups(groups, { segment: "all", period, search }),
            ),
        [groups, period, search],
    );

    const partitioned = useMemo(() => partitionGroupsBySection(filtered), [filtered]);

    const flatForPagination = useMemo(() => {
        const list: ManagerAlertGroup[] = [...partitioned.today, ...partitioned.this_week];
        if (olderExpanded) list.push(...partitioned.older);
        return list;
    }, [partitioned, olderExpanded]);

    const visibleGroups = useMemo(() => flatForPagination.slice(0, visibleLimit), [flatForPagination, visibleLimit]);
    const visibleKeys = useMemo(() => new Set(visibleGroups.map((g) => g.key)), [visibleGroups]);

    const sectionsToRender = useMemo(() => {
        const result: { section: AlertInboxTimeSection; items: ManagerAlertGroup[] }[] = [];
        for (const section of INBOX_SECTION_ORDER) {
            if (section === "older" && !olderExpanded) continue;
            const items = partitioned[section].filter((g) => visibleKeys.has(g.key));
            if (items.length) result.push({ section, items });
        }
        return result;
    }, [partitioned, olderExpanded, visibleKeys]);

    const selectedGroup = useMemo(
        () => (selectedKey ? (groups.find((g) => g.key === selectedKey) ?? null) : null),
        [groups, selectedKey],
    );

    const hasMore = flatForPagination.length > visibleLimit;
    const unreadGroupCount = segmentCounts.unread;
    const emptyCopy = emptyStateMessage(segment);

    const reload = useCallback(async () => {
        await listQuery.refetch();
    }, [listQuery]);

    const applyOptimisticAck = useCallback(
        (ids: string[]) => {
            const idSet = new Set(ids);
            const previous = qc.getQueryData<ManagerNotification[]>(managerNotificationsQueryKeys.list(LIST_FILTERS));
            qc.setQueryData(managerNotificationsQueryKeys.list(LIST_FILTERS), (prev: ManagerNotification[] | undefined) =>
                prev?.map((n) => (idSet.has(n.id) ? { ...n, status: "ack" as const } : n)),
            );
            qc.setQueryData(managerNotificationsQueryKeys.counts(), (prev: unknown) => {
                if (!prev || typeof prev !== "object") return prev;
                const p = prev as Record<string, number>;
                const delta = ids.length;
                return {
                    ...p,
                    unread_count: Math.max(0, (p.unread_count ?? 0) - delta),
                };
            });
            return previous;
        },
        [qc],
    );

    const handleMarkGroupRead = useCallback(
        async (group: ManagerAlertGroup) => {
            const ids = unreadOccurrenceIds(group);
            if (!ids.length) return;

            setAckingKey(group.key);
            const previous = applyOptimisticAck(ids);

            try {
                await Promise.all(ids.map((id) => managerNotificationsApi.ackOne(id)));
                void qc.invalidateQueries({ queryKey: managerNotificationsQueryKeys.counts() });
            } catch (e: unknown) {
                if (previous) {
                    qc.setQueryData(managerNotificationsQueryKeys.list(LIST_FILTERS), previous);
                }
                void qc.invalidateQueries({ queryKey: managerNotificationsQueryKeys.counts() });
                showToast(e instanceof Error ? e.message : "Erreur lors du marquage", "error");
            } finally {
                setAckingKey(null);
            }
        },
        [applyOptimisticAck, qc, showToast],
    );

    const handleAckAll = useCallback(async () => {
        const unreadIds = notifications.filter((n) => isManagerNotificationUnread(n.status)).map((n) => n.id);
        if (!unreadIds.length) return;

        setAckingAll(true);
        const previous = applyOptimisticAck(unreadIds);

        try {
            await Promise.all(unreadIds.map((id) => managerNotificationsApi.ackOne(id)));
            void qc.invalidateQueries({ queryKey: managerNotificationsQueryKeys.counts() });
            showToast("Toutes les notifications marquées comme lues", "success");
        } catch (e: unknown) {
            if (previous) {
                qc.setQueryData(managerNotificationsQueryKeys.list(LIST_FILTERS), previous);
            }
            void qc.invalidateQueries({ queryKey: managerNotificationsQueryKeys.counts() });
            showToast(e instanceof Error ? e.message : "Erreur lors du marquage", "error");
        } finally {
            setAckingAll(false);
        }
    }, [applyOptimisticAck, notifications, qc, showToast]);

    const resetVisibleOnFilterChange = useCallback((next: () => void) => {
        next();
        setVisibleLimit(PAGE_SIZE);
        setOlderExpanded(false);
    }, []);

    const loading = listQuery.isLoading;
    const isEmpty = !loading && filtered.length === 0;

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                {/* Actions */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-tertiary">
                        {groups.length} groupe{groups.length !== 1 ? "s" : ""}
                        {groups.length !== notifications.length
                            ? ` · ${notifications.length} occurrence${notifications.length !== 1 ? "s" : ""}`
                            : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void reload()}
                            disabled={listQuery.isFetching}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3 py-1.5 text-xs text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={12}
                                className={listQuery.isFetching ? "animate-spin" : undefined}
                                aria-hidden
                            />
                            Actualiser
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleAckAll()}
                            disabled={ackingAll || unreadGroupCount === 0}
                            className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {ackingAll ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" aria-hidden />
                                    …
                                </span>
                            ) : (
                                "Tout marquer lu"
                            )}
                        </button>
                    </div>
                </div>

                {/* Segmented + période */}
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                        className="inline-flex flex-wrap rounded-lg border border-secondary p-0.5"
                        role="tablist"
                        aria-label="Filtrer les alertes"
                    >
                        {INBOX_SEGMENTS.map((s) => {
                            const active = segment === s.id;
                            const count = segmentCounts[s.id];
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => resetVisibleOnFilterChange(() => setSegment(s.id))}
                                    className={cx(
                                        "rounded-md px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                                        active
                                            ? "bg-secondary_subtle font-semibold text-primary"
                                            : "text-secondary hover:text-primary",
                                    )}
                                >
                                    {s.label}
                                    <span className="ml-1 tabular-nums opacity-60">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    <div
                        className="inline-flex rounded-lg border border-secondary p-0.5"
                        role="group"
                        aria-label="Période"
                    >
                        {INBOX_PERIODS.map((p) => {
                            const active = period === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => resetVisibleOnFilterChange(() => setPeriod(p.id))}
                                    className={cx(
                                        "rounded-md px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                                        active
                                            ? "bg-secondary_subtle font-semibold text-primary"
                                            : "text-secondary hover:text-primary",
                                    )}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Recherche */}
                <div className="relative shrink-0 max-w-md">
                    <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-tertiary"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setVisibleLimit(PAGE_SIZE);
                        }}
                        placeholder="Rechercher titre ou projet…"
                        aria-label="Rechercher titre ou projet"
                        className="w-full rounded-lg border border-secondary bg-primary py-2 pl-8 pr-3 text-sm text-primary placeholder:text-tertiary focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                </div>

                {/* Liste */}
                <div className="min-h-[12rem] overflow-hidden rounded-xl border border-secondary bg-primary">
                    {loading ? <InboxSkeleton /> : null}

                    {isEmpty ? (
                        <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 py-10 text-center text-tertiary">
                            <ShieldCheck className="mb-2.5 size-9 text-emerald-500" aria-hidden />
                            <p className="text-sm font-medium text-secondary">{emptyCopy.title}</p>
                            <p className="mt-1 text-xs">{emptyCopy.description}</p>
                        </div>
                    ) : null}

                    {!loading && !isEmpty ? (
                        <div>
                            {sectionsToRender.map(({ section, items }) => (
                                <section
                                    key={section}
                                    id={section === "older" ? "alerts-section-older" : undefined}
                                    className="border-b border-secondary last:border-b-0"
                                >
                                    <h3 className="sticky top-0 z-10 border-b border-secondary bg-secondary_subtle/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-tertiary backdrop-blur">
                                        {INBOX_SECTION_LABELS[section]}
                                        <span className="ml-1.5 font-normal tabular-nums opacity-70">
                                            ({partitioned[section].length})
                                        </span>
                                    </h3>
                                    <ul>
                                        {items.map((group) => (
                                            <AlertInboxRow
                                                key={group.key}
                                                group={group}
                                                acking={ackingKey === group.key}
                                                onOpen={(g) => setSelectedKey(g.key)}
                                                onMarkRead={(g) => void handleMarkGroupRead(g)}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            ))}

                            {!olderExpanded && partitioned.older.length > 0 ? (
                                <div className="border-t border-secondary px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setOlderExpanded(true)}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-secondary px-3 py-2 text-xs text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                                        aria-expanded={false}
                                        aria-controls="alerts-section-older"
                                    >
                                        <ChevronDown size={14} aria-hidden />
                                        Afficher les {partitioned.older.length} alerte
                                        {partitioned.older.length > 1 ? "s" : ""} plus ancienne
                                        {partitioned.older.length > 1 ? "s" : ""}
                                    </button>
                                </div>
                            ) : null}

                            {hasMore ? (
                                <div className="border-t border-secondary px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleLimit((n) => n + PAGE_SIZE)}
                                        className="inline-flex w-full items-center justify-center rounded-lg border border-secondary px-3 py-2 text-xs font-medium text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                                    >
                                        Afficher plus
                                        <span className="ml-1.5 tabular-nums opacity-60">
                                            ({Math.min(PAGE_SIZE, flatForPagination.length - visibleLimit)} sur{" "}
                                            {flatForPagination.length - visibleLimit})
                                        </span>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <AlertGroupDrawer
                group={selectedGroup}
                acking={ackingKey === selectedGroup?.key}
                onClose={() => setSelectedKey(null)}
                onMarkRead={(g) => void handleMarkGroupRead(g)}
            />
        </WorkspacePageShell>
    );
}
