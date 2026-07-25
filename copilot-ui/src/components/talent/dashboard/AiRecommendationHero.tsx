import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { useCreateTalentRequest } from "@/hooks/useTalentRequests";
import type { CreateTalentRequestPayload } from "@/types/talent-requests";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

type MatchItem = NonNullable<TalentDashboard["top_matches"]>[number];

type AiRecommendationHeroProps = {
    matches?: TalentDashboard["top_matches"];
    priorities?: TalentDashboard["priorities"];
};

export function AiRecommendationHero({ matches, priorities }: AiRecommendationHeroProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const createMutation = useCreateTalentRequest();

    if (matches === undefined) return null;

    const top = matches[0];
    const priorityItems = (priorities ?? []).slice(0, 3);

    const handleSubmit = (payload: CreateTalentRequestPayload) => {
        if (!top) return;
        createMutation.mutate(
            {
                ...payload,
                request_type: "mobilite",
                payload: {
                    ...(payload.payload ?? {}),
                    project_id: top.project_id,
                    project_name: top.project_name,
                },
            },
            { onSuccess: () => setDialogOpen(false) },
        );
    };

    return (
        <>
            <section
                className={cx(
                    TALENT_SURFACE,
                    "border-l-[3px] border-l-primary-500 bg-gradient-to-r from-primary-500/[0.06] via-primary to-primary p-3 sm:p-4",
                )}
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-600 dark:text-primary-300">
                            <Sparkles className="size-4" aria-hidden />
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold text-primary">Recommandation IA</h2>
                            <p className="text-[10px] text-tertiary">Matchmaker — meilleur alignement projet / profil</p>
                        </div>
                    </div>
                    <Link
                        to="/workspace/talent/opportunities"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    >
                        Toutes les opportunités
                        <ArrowRight className="size-3" aria-hidden />
                    </Link>
                </div>

                {top ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-primary">{top.project_name}</p>
                            <p className="mt-0.5 text-xs text-secondary">
                                Score global {top.overall_score}/10 · Fit compétences {top.skill_fit_score} ·{" "}
                                {top.gap_count} écart{top.gap_count > 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-md bg-primary-600 px-2.5 py-1 text-lg font-bold tabular-nums text-white">
                                {top.overall_score}
                            </span>
                            <Button type="button" color="primary" size="sm" onClick={() => setDialogOpen(true)}>
                                Je suis intéressé(e)
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-tertiary">Aucune recommandation IA pour le moment.</p>
                )}

                {priorityItems.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-secondary/40 pt-3">
                        {priorityItems.map((item, i) => (
                            <li key={`prio-${i}`}>
                                {item.link ? (
                                    <Link
                                        to={item.link}
                                        className="inline-flex max-w-full items-center rounded-md border border-secondary/50 bg-primary/80 px-2.5 py-1 text-[11px] font-medium text-primary hover:border-brand-secondary/40"
                                    >
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                ) : (
                                    <span className="inline-flex max-w-full items-center rounded-md border border-secondary/50 bg-primary/80 px-2.5 py-1 text-[11px] font-medium text-primary">
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </section>

            {top ? (
                <NewTalentRequestDialog
                    isOpen={dialogOpen}
                    onOpenChange={setDialogOpen}
                    isSubmitting={createMutation.isPending}
                    onSubmit={handleSubmit}
                />
            ) : null}
        </>
    );
}
