import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { TALENT_SURFACE, TALENT_SURFACE_ACCENT } from "@/components/talent/ui/talent-workspace-ui";
import { useCreateTalentRequest } from "@/hooks/useTalentRequests";
import type { CreateTalentRequestPayload } from "@/types/talent-requests";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";

type MatchItem = NonNullable<TalentDashboard["top_matches"]>[number];

type OpportunitiesCardProps = {
    opportunities?: TalentDashboard["top_matches"];
    /** Exclure le match mis en avant dans la section Action Required */
    excludeProjectId?: string;
    /** Nombre total d'opportunités (pour l'état vide) */
    totalCount?: number;
};

export function OpportunitiesCard({ opportunities, excludeProjectId, totalCount }: OpportunitiesCardProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
    const createMutation = useCreateTalentRequest();

    const items = useMemo(() => {
        if (!opportunities) return [];
        return [...opportunities]
            .filter((m) => m.project_id !== excludeProjectId)
            .sort((a, b) => b.overall_score - a.overall_score)
            .slice(0, 3);
    }, [opportunities, excludeProjectId]);

    if (opportunities === undefined) return null;

    const empty = items.length === 0;

    const openMobilityDialog = (match: MatchItem) => {
        setSelectedMatch(match);
        setDialogOpen(true);
    };

    const handleSubmit = (payload: CreateTalentRequestPayload) => {
        createMutation.mutate(
            {
                ...payload,
                request_type: "mobilite",
                payload: {
                    ...(payload.payload ?? {}),
                    project_id: selectedMatch?.project_id,
                    project_name: selectedMatch?.project_name,
                },
            },
            {
                onSuccess: () => {
                    setDialogOpen(false);
                    setSelectedMatch(null);
                },
            },
        );
    };

    return (
        <>
            <section className={cx(TALENT_SURFACE, TALENT_SURFACE_ACCENT.ai, "flex h-full flex-col p-5")} aria-labelledby="talent-opportunities-title">
                <header className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300" aria-hidden>
                            <Sparkles className="size-3.5" />
                        </span>
                        <div>
                            <h2 id="talent-opportunities-title" className="text-base font-semibold text-primary">
                                Opportunités IA
                            </h2>
                            <p className="text-xs text-tertiary">Matchmaker — top alignements</p>
                        </div>
                    </div>
                    <Link
                        to="/workspace/talent/opportunities"
                        className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                        aria-label="Voir toutes les opportunités IA"
                    >
                        Voir tout
                        <ArrowRight className="size-3" aria-hidden />
                    </Link>
                </header>

                {empty ? (
                    <p className="py-6 text-center text-sm text-tertiary">
                        {totalCount != null && totalCount > 0
                            ? "La meilleure opportunité est mise en avant ci-dessus."
                            : "Aucune opportunité IA pour le moment."}
                        <br />
                        <Link
                            to="/workspace/talent/opportunities"
                            className="mt-2 inline-block text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                        >
                            Parcourir les opportunités
                        </Link>
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {items.map((match) => (
                            <li
                                key={match.project_id}
                                className="flex items-center gap-2 rounded-lg border border-secondary/50 bg-secondary_subtle/20 p-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-primary">{match.project_name}</p>
                                    <p className="text-xs text-tertiary">
                                        Fit {match.skill_fit_score}/10 · {match.gap_count} écart{match.gap_count > 1 ? "s" : ""}
                                    </p>
                                </div>
                                <span
                                    className="shrink-0 rounded-md bg-primary-600 px-2 py-1 text-sm font-bold tabular-nums text-white"
                                    aria-label={`Score ${match.overall_score}`}
                                >
                                    {match.overall_score}
                                </span>
                                <Button
                                    type="button"
                                    color="secondary"
                                    size="sm"
                                    aria-label={`Manifester mon intérêt pour ${match.project_name}`}
                                    onClick={() => openMobilityDialog(match)}
                                >
                                    Intéressé
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <NewTalentRequestDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                isSubmitting={createMutation.isPending}
                onSubmit={handleSubmit}
            />
        </>
    );
}
