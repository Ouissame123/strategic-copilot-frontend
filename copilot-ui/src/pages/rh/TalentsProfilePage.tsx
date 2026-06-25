import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { NotificationsPaginationControls } from "@/components/rh/notifications/NotificationsPaginationControls";
import { TalentCreateDialog } from "@/components/rh/talents-profile/TalentCreateDialog";
import { TalentDetailPanel } from "@/components/rh/talents-profile/TalentDetailPanel";
import { TalentProfileCard } from "@/components/rh/talents-profile/TalentProfileCard";
import { TalentDeleteConfirm, TalentToggleConfirm } from "@/components/rh/talents-profile/TalentToggleConfirm";
import { TalentsFiltersBar } from "@/components/rh/talents-profile/TalentsFilters";
import { TalentsSummaryBar } from "@/components/rh/talents-profile/TalentsSummaryBar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
    useDeleteTalentProfile,
    useTalentsProfile,
    useToggleTalentProfile,
} from "@/hooks/use-rh-talents-profile";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { TalentProfile, TalentStatus, TalentsListFilters } from "@/types/rh-talents-profile.types";

const PAGE_SIZE = 50;

export default function TalentsProfilePage() {
    useWorkspaceTopbarMeta("Profils talents", "Fiches RH WF_RH_Talents_Profile_CRUD");

    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<TalentProfile | null>(null);
    const [toggleTarget, setToggleTarget] = useState<TalentProfile | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TalentProfile | null>(null);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => window.clearTimeout(t);
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

    const status = (searchParams.get("status") as TalentStatus) ?? "active";
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    const filters: TalentsListFilters = useMemo(
        () => ({
            status,
            search: debouncedSearch || undefined,
            limit: PAGE_SIZE,
            offset,
        }),
        [status, debouncedSearch, offset],
    );

    const listQuery = useTalentsProfile(filters);
    const toggle = useToggleTalentProfile();
    const del = useDeleteTalentProfile();

    const updateParams = useCallback(
        (patch: Record<string, string | null>, resetOffset = true) => {
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

    const items = listQuery.data?.items ?? [];
    const summary = listQuery.data?.summary;
    const count = listQuery.data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const page = Math.floor(offset / PAGE_SIZE) + 1;

    const pagination = {
        total: count,
        limit: PAGE_SIZE,
        offset,
        has_more: offset + PAGE_SIZE < count,
        next_offset: offset + PAGE_SIZE < count ? offset + PAGE_SIZE : null,
        prev_offset: offset > 0 ? Math.max(0, offset - PAGE_SIZE) : null,
        page,
        total_pages: totalPages,
    };

    const hasFilters = Boolean(debouncedSearch) || status !== "active";

    return (
        <WorkspacePageShell role="rh" title="Profils talents" omitHeader>
            <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-ws-primary">Profils talents</h1>
                        <p className="mt-0.5 text-sm text-ws-muted">Fiches RH — WF_RH_Talents_Profile_CRUD</p>
                    </div>
                    <Button color="primary" size="sm" onPress={() => setCreateOpen(true)}>
                        <Plus className="mr-1 size-4" aria-hidden />
                        Nouveau talent
                    </Button>
                </header>

                <TalentsSummaryBar summary={summary} loading={listQuery.isPending} />

                <TalentsFiltersBar
                    search={search}
                    onSearchChange={setSearch}
                    status={status}
                    onStatusChange={(v) => updateParams({ status: v })}
                />

                {listQuery.isError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                        Impossible de charger les profils.{" "}
                        <button type="button" className="font-semibold underline" onClick={() => void listQuery.refetch()}>
                            Réessayer
                        </button>
                    </div>
                ) : null}

                {listQuery.isPending ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-20 animate-pulse rounded-md bg-ws-muted-surface" />
                        ))}
                    </div>
                ) : null}

                {!listQuery.isPending && !listQuery.isError && items.length === 0 && !hasFilters ? (
                    <EmptyState size="md" className="py-12">
                        <EmptyState.Content>
                            <EmptyState.Title>Aucun profil talent</EmptyState.Title>
                            <EmptyState.Description>Créez une fiche talent pour commencer.</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="primary" size="sm" onPress={() => setCreateOpen(true)}>
                                Nouveau talent
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                ) : null}

                {!listQuery.isPending && !listQuery.isError && items.length === 0 && hasFilters ? (
                    <EmptyState size="md" className="py-12">
                        <EmptyState.Content>
                            <EmptyState.Title>Aucun talent ne correspond</EmptyState.Title>
                            <EmptyState.Description>Modifiez les filtres ou réinitialisez la recherche.</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onPress={() => { setSearch(""); updateParams({ search: null, status: "active" }); }}>
                                Réinitialiser
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                ) : null}

                {!listQuery.isPending && items.length > 0 ? (
                    <div className="space-y-2">
                        {items.map((t) => (
                            <TalentProfileCard
                                key={t.talent_id}
                                talent={t}
                                onViewDetail={setSelected}
                                onToggle={setToggleTarget}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                ) : null}

                {count > 0 ? (
                    <NotificationsPaginationControls
                        pagination={pagination}
                        loading={listQuery.isFetching}
                        onOffsetChange={(next) => updateParams({ offset: String(next) }, false)}
                    />
                ) : null}
            </div>

            <TalentCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
            <TalentDetailPanel
                talent={selected}
                onClose={() => setSelected(null)}
                onToggle={(t) => {
                    setSelected(null);
                    setToggleTarget(t);
                }}
                onDelete={(t) => {
                    setSelected(null);
                    setDeleteTarget(t);
                }}
            />
            <TalentToggleConfirm
                talent={toggleTarget}
                onClose={() => setToggleTarget(null)}
                isPending={toggle.isPending}
                onConfirm={(t) => {
                    toggle.mutate(t.talent_id, { onSuccess: () => setToggleTarget(null) });
                }}
            />
            <TalentDeleteConfirm
                talent={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                isPending={del.isPending}
                onConfirm={(t) => {
                    del.mutate(t.talent_id, { onSuccess: () => setDeleteTarget(null) });
                }}
            />
        </WorkspacePageShell>
    );
}
