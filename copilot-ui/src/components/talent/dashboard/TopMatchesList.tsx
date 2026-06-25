import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { useCreateTalentRequest } from "@/hooks/useTalentRequests";
import type { CreateTalentRequestPayload } from "@/types/talent-requests";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { DashboardSectionCard } from "./DashboardSectionCard";
import type { TalentDashboardDensity } from "./use-talent-dashboard-density";
import { cx } from "@/utils/cx";

type MatchItem = NonNullable<TalentDashboard["top_matches"]>[number];

type TopMatchesListProps = {
    matches?: TalentDashboard["top_matches"];
    density: TalentDashboardDensity;
    /** Exclure le match mis en avant dans le hero (évite doublon). */
    excludeProjectId?: string;
};

export function TopMatchesList({ matches, density, excludeProjectId }: TopMatchesListProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
    const createMutation = useCreateTalentRequest();

    if (matches === undefined) return null;

    const compact = density === "compact";
    const items = matches.filter((m) => m.project_id !== excludeProjectId).slice(0, 3);
    const empty = items.length === 0;

    const openMobilityDialog = (match: MatchItem) => {
        setSelectedMatch(match);
        setDialogOpen(true);
    };

    const handleSubmit = (payload: CreateTalentRequestPayload) => {
        const enriched: CreateTalentRequestPayload = {
            ...payload,
            request_type: "mobilite",
            payload: {
                ...(payload.payload ?? {}),
                project_id: selectedMatch?.project_id,
                project_name: selectedMatch?.project_name,
            },
        };
        createMutation.mutate(enriched, {
            onSuccess: () => {
                setDialogOpen(false);
                setSelectedMatch(null);
            },
        });
    };

    return (
        <>
            <DashboardSectionCard
                title="Mes opportunités IA"
                subtitle="Matchmaker"
                ctaLabel="Voir tout"
                ctaHref="/workspace/talent/opportunities"
                density={density}
                accent="ai"
                className="h-full"
            >
                {empty ? (
                    <p className="text-xs text-tertiary">Aucune autre opportunité à afficher.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {items.map((match) => (
                            <li
                                key={match.project_id}
                                className="flex items-center gap-2 rounded-md border border-secondary/50 bg-secondary_subtle/20 px-2.5 py-2"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className={cx("truncate font-medium text-primary", compact ? "text-xs" : "text-sm")}>
                                        {match.project_name}
                                    </p>
                                    <p className="text-[10px] text-tertiary">
                                        Fit {match.skill_fit_score} · {match.gap_count} écart{match.gap_count > 1 ? "s" : ""}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded bg-violet-600/90 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                                    {match.overall_score}
                                </span>
                                <Button type="button" color="secondary" size="sm" onClick={() => openMobilityDialog(match)}>
                                    Intéressé
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </DashboardSectionCard>

            <NewTalentRequestDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                isSubmitting={createMutation.isPending}
                onSubmit={handleSubmit}
            />
        </>
    );
}
