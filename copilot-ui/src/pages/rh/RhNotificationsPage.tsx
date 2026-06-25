import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { NotificationsBulkActionsBar } from "@/components/rh/notifications/BulkActionsBar";
import { NotificationDetailPanel } from "@/components/rh/notifications/NotificationDetailPanel";
import { NotificationsEmptyState } from "@/components/rh/notifications/NotificationsEmptyState";
import { NotificationsFiltersBar } from "@/components/rh/notifications/NotificationsFilters";
import { NotificationsList } from "@/components/rh/notifications/NotificationsList";
import { NotificationsPaginationControls } from "@/components/rh/notifications/NotificationsPaginationControls";
import { NotificationsSummaryBar } from "@/components/rh/notifications/NotificationsSummaryBar";
import { TriggerScanButton } from "@/components/rh/notifications/TriggerScanButton";
import {
    useMarkAllNotificationsAsRead,
    useMarkNotificationAsRead,
    useRhNotifications,
} from "@/hooks/use-rh-notifications";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type {
    NotificationSeverity,
    NotificationType,
    NotificationsFilters,
    NotificationsReadTab,
    RhNotification,
} from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

const DEFAULT_LIMIT = 50;

function parseReadTab(raw: string | null): NotificationsReadTab {
    if (raw === "unread" || raw === "read") return raw;
    return "all";
}

export default function RhNotificationsPage() {
    useWorkspaceTopbarMeta("Notifications RH", "Alertes & risques détectés par l'IA · Demandes urgentes");

    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [selected, setSelected] = useState<RhNotification | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const current = searchParams.get("search") ?? "";
        if (debouncedSearch === current) return;
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (debouncedSearch) next.set("search", debouncedSearch);
            else next.delete("search");
            next.delete("offset");
            return next;
        });
    }, [debouncedSearch, searchParams, setSearchParams]);

    const readTab = parseReadTab(searchParams.get("tab"));
    const severityParam = searchParams.get("severity") as NotificationSeverity | null;
    const typeParam = searchParams.get("type");

    const filters: NotificationsFilters = useMemo(
        () => ({
            limit: DEFAULT_LIMIT,
            offset: parseInt(searchParams.get("offset") ?? "0", 10) || 0,
            order_by: (searchParams.get("order_by") as NotificationsFilters["order_by"]) ?? "created_at",
            order_dir: (searchParams.get("order_dir") as NotificationsFilters["order_dir"]) ?? "desc",
            only_unread: readTab === "unread" || searchParams.get("only_unread") === "true",
            severity: severityParam || undefined,
            type: typeParam || undefined,
            search: debouncedSearch || undefined,
        }),
        [searchParams, readTab, severityParam, typeParam, debouncedSearch],
    );

    const updateFilters = useCallback(
        (patch: Record<string, string | null | undefined>, resetOffset = true) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                for (const [k, v] of Object.entries(patch)) {
                    if (v == null || v === "") next.delete(k);
                    else next.set(k, v);
                }
                if (resetOffset) next.delete("offset");
                return next;
            });
        },
        [setSearchParams],
    );

    const listQuery = useRhNotifications(filters);
    const markAll = useMarkAllNotificationsAsRead();
    const markOne = useMarkNotificationAsRead();

    const items = listQuery.data?.items ?? [];
    const summary = listQuery.data?.summary;
    const pagination = listQuery.data?.pagination;

    const visibleItems = useMemo(() => {
        if (readTab === "read") return items.filter((n) => n.is_read);
        if (readTab === "unread") return items.filter((n) => !n.is_read);
        return items;
    }, [items, readTab]);

    const unreadOnPage = items.filter((n) => !n.is_read).length;

    const openPanel = (n: RhNotification) => {
        setSelected(n);
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setSelected(null);
    };

    const resetFilters = () => {
        setSearch("");
        setSearchParams(new URLSearchParams());
        setBulkSelected(new Set());
    };

    const toggleBulk = (id: string) => {
        setBulkSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkMarkRead = async () => {
        const ids = [...bulkSelected].filter((id) => {
            const n = items.find((x) => x.id === id);
            return n && !n.is_read;
        });
        for (const id of ids) {
            try {
                await markOne.mutateAsync(id);
            } catch {
                break;
            }
        }
        setBulkSelected(new Set());
    };

    const handleMarkAllUnread = () => {
        const ids = items.filter((n) => !n.is_read).map((n) => n.id);
        if (ids.length) void markAll.mutateAsync(ids);
    };

    const hasActiveFilters =
        Boolean(debouncedSearch) ||
        Boolean(severityParam) ||
        Boolean(typeParam) ||
        readTab !== "all" ||
        searchParams.get("only_unread") === "true";

    return (
        <WorkspacePageShell role="rh" title="Notifications RH" omitHeader>
            <div className="space-y-4">
                <header className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-ws-border-subtle bg-ws-canvas pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-ws-primary">Notifications RH</h1>
                            <p className="mt-0.5 text-sm text-ws-muted">
                                Alertes & risques détectés par l&apos;IA · Demandes urgentes
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <TriggerScanButton />
                            <Button
                                color="secondary"
                                size="sm"
                                isDisabled={!summary?.unread_count || markAll.isPending}
                                isLoading={markAll.isPending}
                                onPress={handleMarkAllUnread}
                            >
                                Tout marquer comme lu
                            </Button>
                        </div>
                    </div>

                    <NotificationsSummaryBar
                        summary={summary}
                        loading={listQuery.isPending}
                        onUnreadClick={() => updateFilters({ tab: "unread", only_unread: "true" })}
                        onCriticalClick={() =>
                            updateFilters({ severity: "critical", tab: "unread", only_unread: "true" })
                        }
                        onHighClick={() => updateFilters({ severity: "high", tab: "unread", only_unread: "true" })}
                        onMediumClick={() =>
                            updateFilters({ severity: "medium", tab: "unread", only_unread: "true" })
                        }
                        onUrgentClick={() => updateFilters({ type: "urgent_request", tab: "unread" })}
                        onRiskClick={() => updateFilters({ type: "talent_at_risk" })}
                    />
                </header>

                <NotificationsFiltersBar
                    search={search}
                    onSearchChange={setSearch}
                    severity={(severityParam as NotificationSeverity | "all") ?? "all"}
                    onSeverityChange={(v) => updateFilters({ severity: v === "all" ? null : v })}
                    type={(typeParam as NotificationType | "all") ?? "all"}
                    onTypeChange={(v) => updateFilters({ type: v === "all" ? null : v })}
                    onlyUnread={searchParams.get("only_unread") === "true" || readTab === "unread"}
                    onOnlyUnreadChange={(v) => updateFilters({ only_unread: v ? "true" : null, tab: v ? "unread" : null })}
                    onReset={resetFilters}
                />

                <div className="flex flex-wrap gap-1 border-b border-ws-border-subtle pb-2" role="tablist">
                    {(
                        [
                            { id: "all" as const, label: "Toutes", count: pagination?.total ?? items.length },
                            { id: "unread" as const, label: "Non lues", count: summary?.unread_count ?? unreadOnPage },
                            { id: "read" as const, label: "Lues", count: Math.max(0, (pagination?.total ?? 0) - (summary?.unread_count ?? 0)) },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={readTab === tab.id}
                            onClick={() =>
                                updateFilters({
                                    tab: tab.id === "all" ? null : tab.id,
                                    only_unread: tab.id === "unread" ? "true" : null,
                                })
                            }
                            className={cx(
                                "rounded-full px-3 py-1 text-sm transition",
                                readTab === tab.id
                                    ? "bg-ws-muted-surface font-medium text-ws-primary"
                                    : "text-ws-muted hover:bg-ws-subtle",
                            )}
                        >
                            {tab.label}
                            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                            {tab.id === "unread" && (summary?.unread_count ?? 0) > 0 ? (
                                <span className="ml-1 inline-block size-1.5 rounded-full bg-ws-accent" aria-hidden />
                            ) : null}
                        </button>
                    ))}
                </div>

                {listQuery.isPending ? (
                    <div className="space-y-2 py-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-md bg-ws-muted-surface" />
                        ))}
                    </div>
                ) : null}

                {listQuery.isError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                        Impossible de charger les notifications.{" "}
                        <button type="button" className="font-semibold underline" onClick={() => void listQuery.refetch()}>
                            Réessayer
                        </button>
                    </div>
                ) : null}

                {!listQuery.isPending && !listQuery.isError && visibleItems.length === 0 && !hasActiveFilters ? (
                    <NotificationsEmptyState variant="inbox-empty" />
                ) : null}

                {!listQuery.isPending && !listQuery.isError && visibleItems.length === 0 && hasActiveFilters ? (
                    <NotificationsEmptyState
                        variant={readTab === "read" ? "filtered-read" : "no-results"}
                        onReset={resetFilters}
                    />
                ) : null}

                {!listQuery.isPending && !listQuery.isError && visibleItems.length > 0 ? (
                    <NotificationsList
                        items={visibleItems}
                        selectedIds={bulkSelected}
                        onSelect={openPanel}
                        onBulkToggle={toggleBulk}
                    />
                ) : null}

                {pagination ? (
                    <NotificationsPaginationControls
                        pagination={pagination}
                        loading={listQuery.isFetching}
                        onOffsetChange={(offset) => updateFilters({ offset: String(offset) }, false)}
                    />
                ) : null}
            </div>

            <NotificationDetailPanel open={panelOpen} notification={selected} onClose={closePanel} />

            <NotificationsBulkActionsBar
                count={bulkSelected.size}
                onMarkRead={() => void handleBulkMarkRead()}
                onClear={() => setBulkSelected(new Set())}
                isLoading={markOne.isPending}
            />
        </WorkspacePageShell>
    );
}
