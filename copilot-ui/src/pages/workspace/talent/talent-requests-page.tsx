import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { TalentRequestDrawer } from "@/components/talent/requests/TalentRequestDrawer";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import {
    RequestCard,
    RequestsEmptyState,
    RequestsStatsBar,
    RequestsToolbar,
    emptyTitleForTab,
    filterRequestsBySearch,
    filterUrgentRequests,
    parseTabParam,
    searchEmptyTitle,
    sortRequestsByCreatedDesc,
    tabToApiStatus,
    type RequestsStatKey,
    type TalentRequestsTab,
} from "@/features/talent/requests";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useCreateTalentRequest,
    useTalentRequestsList,
    useTalentRequestsSummary,
} from "@/hooks/useTalentRequests";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { TalentRequest, TalentRequestType } from "@/types/talent-requests";

export function TalentRequestsPage() {
    useCopilotPage("none", "Mes demandes");
    useWorkspaceTopbarMeta(
        "Mes demandes",
        "Formations, mobilité, congés et autres demandes transmises à votre manager et aux RH.",
    );

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseTabParam(searchParams.get("tab"));
    const typeFilter = (searchParams.get("type") ?? "all") as TalentRequestType | "all";
    const [search, setSearch] = useState("");
    const [urgentOnly, setUrgentOnly] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<TalentRequest | null>(null);

    const apiStatus = urgentOnly ? undefined : tabToApiStatus(tab);
    const listFilters = useMemo(
        () => ({
            ...(apiStatus ? { status: apiStatus } : {}),
            ...(typeFilter !== "all" ? { request_type: typeFilter } : {}),
        }),
        [apiStatus, typeFilter],
    );

    const summaryQuery = useTalentRequestsSummary();
    const listQuery = useTalentRequestsList(listFilters);
    const createMutation = useCreateTalentRequest();

    const filteredItems = useMemo(() => {
        let items = listQuery.data ?? [];
        if (urgentOnly) items = filterUrgentRequests(items);
        items = filterRequestsBySearch(items, search);
        return sortRequestsByCreatedDesc(items);
    }, [listQuery.data, search, urgentOnly]);

    const activeStat: RequestsStatKey | null = urgentOnly
        ? "urgent"
        : tab === "pending" || tab === "accepted"
          ? tab
          : null;

    const setTab = useCallback(
        (next: TalentRequestsTab) => {
            setUrgentOnly(false);
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (next === "all") params.delete("tab");
                else params.set("tab", next);
                return params;
            });
        },
        [setSearchParams],
    );

    const setTypeFilter = useCallback(
        (next: TalentRequestType | "all") => {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (next === "all") params.delete("type");
                else params.set("type", next);
                return params;
            });
        },
        [setSearchParams],
    );

    const handleStatClick = useCallback(
        (key: RequestsStatKey) => {
            if (key === "urgent") {
                setUrgentOnly(true);
                setSearchParams((prev) => {
                    const params = new URLSearchParams(prev);
                    params.delete("tab");
                    return params;
                });
                return;
            }
            setTab(key);
        },
        [setSearchParams, setTab],
    );

    const openDrawer = (request: TalentRequest) => {
        setSelectedId(request.id);
        setSelectedRow(request);
    };

    const closeDrawer = () => {
        setSelectedId(null);
        setSelectedRow(null);
    };

    const handleCreate = (payload: Parameters<typeof createMutation.mutate>[0]) => {
        createMutation.mutate(payload, {
            onSuccess: () => {
                setCreateOpen(false);
            },
        });
    };

    const openCreate = () => setCreateOpen(true);

    const showEmpty = !listQuery.isLoading && !listQuery.isError && filteredItems.length === 0;
    const searchTrimmed = search.trim();
    const emptyTitle = searchTrimmed
        ? searchEmptyTitle(searchTrimmed)
        : urgentOnly
          ? "Aucune demande urgente"
          : emptyTitleForTab(tab);
    const showNewRequestOnEmpty = !searchTrimmed;

    return (
        <div className={TALENT_PAGE_STACK}>
            {summaryQuery.isError ? (
                <ErrorState
                    title="Résumé indisponible"
                    message="Impossible de charger les indicateurs."
                    detail={summaryQuery.error instanceof Error ? summaryQuery.error.message : String(summaryQuery.error)}
                    onRetry={() => void summaryQuery.refetch()}
                />
            ) : (
                <RequestsStatsBar
                    summary={summaryQuery.data}
                    isLoading={summaryQuery.isLoading}
                    activeStat={activeStat}
                    onStatClick={handleStatClick}
                />
            )}

            <RequestsToolbar
                tab={urgentOnly ? "all" : tab}
                typeFilter={typeFilter}
                search={search}
                summary={summaryQuery.data}
                onTabChange={setTab}
                onTypeChange={setTypeFilter}
                onSearchChange={setSearch}
                onNewRequest={openCreate}
            />

            {listQuery.isLoading ? (
                <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-36 animate-pulse rounded-lg bg-secondary" />
                    ))}
                </div>
            ) : null}

            {listQuery.isError ? (
                <ErrorState
                    title="Liste indisponible"
                    message="Impossible de charger vos demandes."
                    detail={listQuery.error instanceof Error ? listQuery.error.message : String(listQuery.error)}
                    onRetry={() => void listQuery.refetch()}
                />
            ) : null}

            {showEmpty ? (
                <RequestsEmptyState
                    title={emptyTitle}
                    description={
                        searchTrimmed
                            ? undefined
                            : tab === "all" && !urgentOnly
                              ? "Créez une demande pour la transmettre à votre manager et aux RH."
                              : undefined
                    }
                    onNewRequest={showNewRequestOnEmpty ? openCreate : undefined}
                />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                    {filteredItems.map((request) => (
                        <RequestCard key={request.id} request={request} onClick={openDrawer} />
                    ))}
                </div>
            ) : null}

            <NewTalentRequestDialog
                isOpen={createOpen}
                onOpenChange={setCreateOpen}
                isSubmitting={createMutation.isPending}
                onSubmit={handleCreate}
            />

            <TalentRequestDrawer
                open={Boolean(selectedId)}
                requestId={selectedId}
                listRow={selectedRow}
                onClose={closeDrawer}
            />
        </div>
    );
}
