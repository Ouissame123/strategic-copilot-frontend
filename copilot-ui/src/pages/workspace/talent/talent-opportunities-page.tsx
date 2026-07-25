import { useMemo, useState } from "react";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { NativeSelect } from "@/components/base/select/select-native";
import { ExpressInterestModal } from "@/components/talent/opportunities/ExpressInterestModal";
import { OpportunityDetailDrawer } from "@/components/talent/opportunities/OpportunityDetailDrawer";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import {
    DEFAULT_MIN_SCORE,
    OPPORTUNITY_SORT_OPTIONS,
    OpportunityCard,
    OpportunityStatsBar,
    ScoreSlider,
    type OpportunitySortKey,
} from "@/features/talent/opportunities";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useExpressInterest,
    useTalentOpportunitiesList,
    useTalentOpportunitiesSummary,
} from "@/hooks/useTalentOpportunities";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { OpportunityListItem } from "@/types/talent-opportunities";

function sortOpportunities(items: OpportunityListItem[], sortKey: OpportunitySortKey): OpportunityListItem[] {
    const sorted = [...items];
    switch (sortKey) {
        case "fit":
            return sorted.sort((a, b) => b.skill_fit_score - a.skill_fit_score);
        case "name":
            return sorted.sort((a, b) => a.project_name.localeCompare(b.project_name, "fr", { sensitivity: "base" }));
        case "overall":
        default:
            return sorted.sort((a, b) => b.overall_score - a.overall_score);
    }
}

export function TalentOpportunitiesPage() {
    useCopilotPage("none", "Mes opportunités");
    useWorkspaceTopbarMeta("Mes opportunités", "Projets suggérés par l'IA");

    const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);
    const [sortKey, setSortKey] = useState<OpportunitySortKey>("overall");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<OpportunityListItem | null>(null);
    const [interestTarget, setInterestTarget] = useState<OpportunityListItem | null>(null);

    const summaryQuery = useTalentOpportunitiesSummary();
    const listQuery = useTalentOpportunitiesList();
    const expressMutation = useExpressInterest();

    const filteredItems = useMemo(() => {
        const items = listQuery.data ?? [];
        const filtered = items.filter((o) => o.overall_score >= minScore);
        return sortOpportunities(filtered, sortKey);
    }, [listQuery.data, minScore, sortKey]);

    const openDrawer = (opportunity: OpportunityListItem) => {
        setSelectedId(opportunity.project_id);
        setSelectedRow(opportunity);
    };

    const closeDrawer = () => {
        setSelectedId(null);
        setSelectedRow(null);
    };

    const openInterestModal = (opportunity: OpportunityListItem) => {
        setInterestTarget(opportunity);
    };

    const handleExpressInterest = (message?: string) => {
        if (!interestTarget) return;
        expressMutation.mutate(
            { project_id: interestTarget.project_id, message },
            {
                onSuccess: () => {
                    setInterestTarget(null);
                },
            },
        );
    };

    const showGlobalEmpty =
        !summaryQuery.isLoading &&
        !summaryQuery.isError &&
        summaryQuery.data?.total_matches === 0;

    const showFilteredEmpty =
        !listQuery.isLoading &&
        !listQuery.isError &&
        !showGlobalEmpty &&
        filteredItems.length === 0;

    return (
        <div className={TALENT_PAGE_STACK}>
            {summaryQuery.isError ? (
                <ErrorState
                    title="Résumé indisponible"
                    message="Impossible de charger les indicateurs."
                    detail={
                        summaryQuery.error instanceof Error ? summaryQuery.error.message : String(summaryQuery.error)
                    }
                    onRetry={() => void summaryQuery.refetch()}
                />
            ) : (
                <OpportunityStatsBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            {!showGlobalEmpty ? (
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <ScoreSlider
                        value={minScore}
                        onChange={setMinScore}
                        displayedCount={filteredItems.length}
                        className="min-w-0 flex-1 md:max-w-md"
                    />
                    <NativeSelect
                        label="Trier par"
                        className="w-full shrink-0 md:w-48"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as OpportunitySortKey)}
                        options={OPPORTUNITY_SORT_OPTIONS}
                    />
                </div>
            ) : null}

            {showGlobalEmpty ? (
                <EmptyState
                    title="Aucun match pour l'instant"
                    description="L'IA n'a pas encore trouvé de match — reviens plus tard."
                />
            ) : null}

            {listQuery.isLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-52 animate-pulse rounded-2xl bg-secondary" />
                    ))}
                </div>
            ) : null}

            {listQuery.isError ? (
                <ErrorState
                    title="Liste indisponible"
                    message="Impossible de charger les opportunités."
                    detail={listQuery.error instanceof Error ? listQuery.error.message : String(listQuery.error)}
                    onRetry={() => void listQuery.refetch()}
                />
            ) : null}

            {showFilteredEmpty ? (
                <EmptyState
                    title="Aucune opportunité à ce seuil"
                    description={`Aucun projet ne dépasse un score de ${minScore.toFixed(1)}/10. Baisse le filtre pour en voir plus.`}
                />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && filteredItems.length > 0 ? (
                <div className="grid items-stretch gap-3 md:grid-cols-2">
                    {filteredItems.map((opportunity) => (
                        <OpportunityCard
                            key={opportunity.project_id}
                            opportunity={opportunity}
                            onClick={openDrawer}
                            onExpressInterest={openInterestModal}
                        />
                    ))}
                </div>
            ) : null}

            <OpportunityDetailDrawer
                open={Boolean(selectedId)}
                projectId={selectedId}
                listRow={selectedRow}
                onClose={closeDrawer}
            />

            <ExpressInterestModal
                isOpen={Boolean(interestTarget)}
                projectName={interestTarget?.project_name ?? null}
                isSubmitting={expressMutation.isPending}
                onOpenChange={(open) => {
                    if (!open) setInterestTarget(null);
                }}
                onSubmit={handleExpressInterest}
            />
        </div>
    );
}
