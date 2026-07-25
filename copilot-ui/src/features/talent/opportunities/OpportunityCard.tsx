import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import type { OpportunityListItem } from "@/types/talent-opportunities";
import { cx } from "@/utils/cx";
import { OpportunityScoreGauges } from "./OpportunityScoreGauges";
import {
    OPPORTUNITY_CARD_FOOTER_CLASS,
    badgeToneClass,
    formatOpportunityScore,
    outlineBadgeClass,
    resolveScoreBadge,
} from "./talent-opportunities-ui";
import { parseMatchmakerNote } from "./utils/parseMatchmakerNote";

type OpportunityCardProps = {
    opportunity: OpportunityListItem;
    onClick: (opportunity: OpportunityListItem) => void;
    onExpressInterest: (opportunity: OpportunityListItem) => void;
};

export function OpportunityCard({ opportunity, onClick, onExpressInterest }: OpportunityCardProps) {
    const scoreBadge = resolveScoreBadge(opportunity.overall_score);
    const { qualitativeNote } = parseMatchmakerNote(opportunity.match_summary);
    const teamLabel =
        opportunity.team_size <= 0
            ? "Nouvelle équipe"
            : `${opportunity.team_size} talent${opportunity.team_size > 1 ? "s" : ""} équipe`;

    return (
        <article className="flex h-full w-full flex-col gap-3 rounded-lg border border-secondary/60 bg-primary p-4 shadow-sm transition hover:border-brand-secondary/40 hover:shadow-md dark:border-secondary/60 dark:bg-primary">
            <button
                type="button"
                onClick={() => onClick(opportunity)}
                className="flex w-full flex-1 flex-col gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-solid"
            >
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 line-clamp-2 font-semibold text-primary">
                        {opportunity.project_name}
                    </p>
                    <span className={cx("shrink-0", badgeToneClass(scoreBadge.tone))}>
                        {scoreBadge.label} · {formatOpportunityScore(opportunity.overall_score)}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {opportunity.recommendation_label ? (
                        <span className={outlineBadgeClass()}>{opportunity.recommendation_label}</span>
                    ) : null}
                    <span className={outlineBadgeClass()}>{teamLabel}</span>
                </div>

                <OpportunityScoreGauges
                    skillFitScore={opportunity.skill_fit_score}
                    availabilityScore={opportunity.availability_score}
                    gapCount={opportunity.gap_count}
                />

                {qualitativeNote ? (
                    <p className="line-clamp-2 text-xs italic text-tertiary">{qualitativeNote}</p>
                ) : null}
            </button>

            <div className={OPPORTUNITY_CARD_FOOTER_CLASS}>
                {opportunity.already_interested ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50">
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            Intérêt envoyé
                        </span>
                        <Link
                            to="/workspace/talent/requests"
                            className="text-xs font-medium text-brand-secondary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Voir ma demande
                        </Link>
                    </>
                ) : (
                    <Button
                        type="button"
                        color="secondary"
                        size="sm"
                        className="text-brand-secondary ring-brand-secondary/50 hover:text-brand-secondary_hover"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpressInterest(opportunity);
                        }}
                    >
                        Je suis intéressé(e)
                    </Button>
                )}
            </div>
        </article>
    );
}
