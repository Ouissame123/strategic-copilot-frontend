import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { NewTalentRequestDialog } from "@/components/talent/requests/NewTalentRequestDialog";
import { toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import { useCreateTalentRequest } from "@/hooks/useTalentRequests";
import type { CreateTalentRequestPayload } from "@/types/talent-requests";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";

type MatchItem = NonNullable<TalentDashboard["top_matches"]>[number];

type ActionRequiredBlockProps = {
    topRecommendation: MatchItem;
    opportunitiesCount: number;
    pendingRequestsCount: number;
};

export function ActionRequiredBlock({
    topRecommendation,
    opportunitiesCount,
    pendingRequestsCount,
}: ActionRequiredBlockProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const createMutation = useCreateTalentRequest();
    const pendingCls = toneClasses("orange");

    const handleSubmit = (payload: CreateTalentRequestPayload) => {
        createMutation.mutate(
            {
                ...payload,
                request_type: "mobilite",
                payload: {
                    ...(payload.payload ?? {}),
                    project_id: topRecommendation.project_id,
                    project_name: topRecommendation.project_name,
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
                    "border-primary-200 bg-gradient-to-r from-primary-50/80 to-primary-50/80 p-5 dark:border-primary-800 dark:from-primary-950/30 dark:to-primary-950/30",
                )}
                aria-labelledby="talent-action-required-title"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-[min(100%,18rem)] flex-1 items-start gap-3">
                        <div className="mt-1 rounded-lg bg-primary-600 p-2 text-white" aria-hidden>
                            <Sparkles className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-tertiary">Recommandation IA · Matchmaker</p>
                            <h2 id="talent-action-required-title" className="mt-0.5 text-lg font-bold text-primary">
                                {topRecommendation.project_name}
                            </h2>
                            <p className="mt-1 text-sm text-tertiary">
                                Score global{" "}
                                <span className="font-medium text-secondary">{topRecommendation.overall_score}/10</span>
                                {" · "}
                                Fit compétences{" "}
                                <span className="font-medium text-secondary">{topRecommendation.skill_fit_score}/10</span>
                                {" · "}
                                {topRecommendation.gap_count} écart{topRecommendation.gap_count > 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <span
                            className="rounded-lg bg-primary-600 px-3 py-2 text-2xl font-bold tabular-nums text-white"
                            aria-label={`Score ${topRecommendation.overall_score} sur 10`}
                        >
                            {topRecommendation.overall_score.toFixed(0)}
                        </span>
                        <Button
                            type="button"
                            color="primary"
                            size="sm"
                            iconTrailing={ArrowRight}
                            aria-label={`Manifester mon intérêt pour ${topRecommendation.project_name}`}
                            onClick={() => setDialogOpen(true)}
                        >
                            Je suis intéressé(e)
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-secondary_subtle px-2.5 py-1 text-xs font-medium text-secondary ring-1 ring-secondary/50">
                        {opportunitiesCount} opportunité{opportunitiesCount > 1 ? "s" : ""} IA
                    </span>
                    {pendingRequestsCount > 0 ? (
                        <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", pendingCls.badge)}>
                            {pendingRequestsCount} demande{pendingRequestsCount > 1 ? "s" : ""} en attente
                        </span>
                    ) : null}
                    <Link
                        to="/workspace/talent/opportunities"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    >
                        Toutes les opportunités
                        <ArrowRight className="size-3" aria-hidden />
                    </Link>
                </div>
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
