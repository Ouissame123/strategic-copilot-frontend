import { useMemo, useState } from "react";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Slider } from "@/components/base/slider/slider";
import { ExpressInterestModal } from "@/components/talent/opportunities/ExpressInterestModal";
import { OpportunitiesKpiBar } from "@/components/talent/opportunities/OpportunitiesKpiBar";
import { OpportunityCard } from "@/components/talent/opportunities/OpportunityCard";
import { OpportunityDetailDrawer } from "@/components/talent/opportunities/OpportunityDetailDrawer";
import { TalentOpportunitiesDensityToggle } from "@/components/talent/opportunities/TalentOpportunitiesDensityToggle";
import {
    DEFAULT_MIN_SCORE,
    readTalentOpportunitiesDensity,
    writeTalentOpportunitiesDensity,
    type TalentOpportunitiesDensity,
} from "@/components/talent/opportunities/talent-opportunities-ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useExpressInterest,
    useTalentOpportunitiesList,
    useTalentOpportunitiesSummary,
} from "@/hooks/useTalentOpportunities";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { OpportunityListItem } from "@/types/talent-opportunities";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

export function TalentOpportunitiesPage() {
    useCopilotPage("none", "Mes opportunités");
    useWorkspaceTopbarMeta("Mes opportunités", "Projets suggérés par l'IA");

    const [density, setDensity] = useState<TalentOpportunitiesDensity>(() => readTalentOpportunitiesDensity());
    const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<OpportunityListItem | null>(null);
    const [interestTarget, setInterestTarget] = useState<OpportunityListItem | null>(null);

    const summaryQuery = useTalentOpportunitiesSummary();
    const listQuery = useTalentOpportunitiesList();
    const expressMutation = useExpressInterest();

    const filteredItems = useMemo(() => {
        const items = listQuery.data ?? [];
        return items
            .filter((o) => o.overall_score >= minScore)
            .sort((a, b) => b.overall_score - a.overall_score);
    }, [listQuery.data, minScore]);

    const toggleDensity = () => {
        const next: TalentOpportunitiesDensity = density === "compact" ? "comfortable" : "compact";
        setDensity(next);
        writeTalentOpportunitiesDensity(next);
    };

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
                <OpportunitiesKpiBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            {!showGlobalEmpty ? (
                <div className="rounded-lg border border-secondary/60 bg-primary px-3 py-3 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-[200px] flex-1 max-w-md">
                            <label className="mb-2 block text-sm font-medium text-primary">
                                Score minimum : {minScore.toFixed(1)}/10
                            </label>
                            <Slider
                                minValue={6.5}
                                maxValue={10}
                                step={0.1}
                                value={minScore}
                                onChange={(v) => setMinScore(Number(v))}
                                labelFormatter={(v) => `${v.toFixed(1)}/10`}
                                formatOptions={{ style: "decimal", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-tertiary">
                                {filteredItems.length} opportunité{filteredItems.length > 1 ? "s" : ""} affichée
                                {filteredItems.length > 1 ? "s" : ""}
                            </p>
                            <TalentOpportunitiesDensityToggle density={density} onToggle={toggleDensity} />
                        </div>
                    </div>
                </div>
            ) : null}

            {showGlobalEmpty ? (
                <EmptyState
                    title="Aucun match pour l'instant"
                    description="L'IA n'a pas encore trouvé de match — reviens plus tard."
                />
            ) : null}

            {listQuery.isLoading ? (
                <div
                    className={cx(
                        "grid gap-3",
                        density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                    )}
                >
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-44 animate-pulse rounded-2xl bg-secondary" />
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
                <div
                    className={cx(
                        "grid gap-3",
                        density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                    )}
                >
                    {filteredItems.map((opportunity) => (
                        <OpportunityCard
                            key={opportunity.project_id}
                            opportunity={opportunity}
                            density={density}
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
