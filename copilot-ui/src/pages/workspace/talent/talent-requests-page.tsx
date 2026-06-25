import { useCallback, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { TalentRequestCard } from "@/components/talent/requests/TalentRequestCard";
import { TalentRequestDrawer } from "@/components/talent/requests/TalentRequestDrawer";
import { TalentRequestsDensityToggle } from "@/components/talent/requests/TalentRequestsDensityToggle";
import { TalentRequestsInsightBar } from "@/components/talent/requests/TalentRequestsInsightBar";
import {
    REQUEST_TYPE_OPTIONS,
    TALENT_REQUEST_TABS,
    parseTabParam,
    readTalentRequestsDensity,
    tabToApiStatus,
    writeTalentRequestsDensity,
    type TalentRequestsDensity,
    type TalentRequestsTab,
} from "@/components/talent/requests/talent-request-ui";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useCreateTalentRequest,
    useTalentRequestsList,
    useTalentRequestsSummary,
} from "@/hooks/useTalentRequests";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { TalentRequest, TalentRequestType } from "@/types/talent-requests";
import { TALENT_PAGE_STACK, TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE, TALENT_SEGMENTED } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

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
    const [density, setDensity] = useState<TalentRequestsDensity>(() => readTalentRequestsDensity());
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<TalentRequest | null>(null);

    const apiStatus = tabToApiStatus(tab);
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
        const items = listQuery.data ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => item.title.toLowerCase().includes(q));
    }, [listQuery.data, search]);

    const setTab = useCallback(
        (next: TalentRequestsTab) => {
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

    const toggleDensity = () => {
        const next: TalentRequestsDensity = density === "compact" ? "comfortable" : "compact";
        setDensity(next);
        writeTalentRequestsDensity(next);
    };

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

    const showEmpty = !listQuery.isLoading && !listQuery.isError && filteredItems.length === 0;
    const hasActiveFilters = tab !== "all" || typeFilter !== "all" || search.trim().length > 0;

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
                <TalentRequestsInsightBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={TALENT_SEGMENTED}>
                    {TALENT_REQUEST_TABS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => setTab(item.value)}
                            className={cx(
                                "rounded px-2.5 py-1 text-xs transition",
                                tab === item.value ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" color="primary" iconLeading={Plus} onClick={() => setCreateOpen(true)}>
                        Nouvelle demande
                    </Button>
                    <TalentRequestsDensityToggle density={density} onToggle={toggleDensity} />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <NativeSelect
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TalentRequestType | "all")}
                    className="min-w-[180px]"
                    options={REQUEST_TYPE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
                />
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par titre…"
                        className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary outline-none focus:border-brand-secondary"
                    />
                </div>
            </div>

            {listQuery.isLoading ? (
                <div className={cx("grid gap-3", density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2")}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary" />
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
                <EmptyState size="md">
                    <EmptyState.Header>
                        <EmptyState.FeaturedIcon color="gray" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>
                            {hasActiveFilters ? "Aucune demande ne correspond" : "Vous n'avez pas encore créé de demande"}
                        </EmptyState.Title>
                        <EmptyState.Description>
                            {hasActiveFilters
                                ? "Essayez d'élargir vos filtres ou de modifier votre recherche."
                                : "Créez une demande pour la transmettre à votre manager et aux RH."}
                        </EmptyState.Description>
                    </EmptyState.Content>
                    {!hasActiveFilters ? (
                        <EmptyState.Footer>
                            <Button type="button" color="primary" iconLeading={Plus} onClick={() => setCreateOpen(true)}>
                                Nouvelle demande
                            </Button>
                        </EmptyState.Footer>
                    ) : null}
                </EmptyState>
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && filteredItems.length > 0 ? (
                <div className={cx("grid gap-3", density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2")}>
                    {filteredItems.map((request) => (
                        <TalentRequestCard
                            key={request.id}
                            request={request}
                            density={density}
                            onClick={openDrawer}
                        />
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
