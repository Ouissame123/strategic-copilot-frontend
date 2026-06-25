import { CheckCircle2, Users } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import type { OpportunityListItem } from "@/types/talent-opportunities";
import { cx } from "@/utils/cx";
import {
    RECO_TONES,
    SCORE_TIER_TONES,
    badgeToneClass,
    formatOpportunityScore,
    type TalentOpportunitiesDensity,
} from "./talent-opportunities-ui";

type OpportunityCardProps = {
    opportunity: OpportunityListItem;
    density: TalentOpportunitiesDensity;
    onClick: (opportunity: OpportunityListItem) => void;
    onExpressInterest: (opportunity: OpportunityListItem) => void;
};

export function OpportunityCard({ opportunity, density, onClick, onExpressInterest }: OpportunityCardProps) {
    const isCompact = density === "compact";
    const tierTone = SCORE_TIER_TONES[opportunity.score_tier] ?? "slate";
    const recoTone = RECO_TONES[opportunity.recommendation_type] ?? "slate";

    return (
        <article
            className={cx(
                "flex w-full flex-col rounded-lg border border-secondary/60 bg-primary shadow-sm transition hover:border-brand-secondary/40 hover:shadow-md",
                isCompact ? "gap-2 p-3" : "gap-2.5 p-4",
            )}
        >
            <button type="button" onClick={() => onClick(opportunity)} className="flex w-full flex-col gap-3 text-left">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                        className={cx(
                            "min-w-0 flex-1 font-semibold text-primary",
                            isCompact ? "text-sm line-clamp-1" : "text-base line-clamp-2",
                        )}
                    >
                        {opportunity.project_name}
                    </p>
                    <span className={cx("shrink-0", badgeToneClass(tierTone))}>
                        {opportunity.score_label} · {formatOpportunityScore(opportunity.overall_score)}
                    </span>
                </div>

                <p className={cx("text-secondary", isCompact ? "text-xs" : "text-sm")}>
                    Skill fit : {opportunity.skill_fit_score} · Disponibilité : {opportunity.availability_score} ·{" "}
                    {opportunity.gap_count} écart{opportunity.gap_count > 1 ? "s" : ""}
                </p>

                <div className={cx("flex flex-wrap items-center gap-2", isCompact ? "text-[11px]" : "text-xs")}>
                    {opportunity.recommendation_label ? (
                        <span className={badgeToneClass(recoTone)}>{opportunity.recommendation_label}</span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-tertiary">
                        <Users className="size-3.5 shrink-0" aria-hidden />
                        {opportunity.team_size} talents équipe
                    </span>
                </div>

                {opportunity.match_summary ? (
                    <p className={cx("line-clamp-2 text-tertiary", isCompact ? "text-xs" : "text-sm")}>
                        {opportunity.match_summary}
                    </p>
                ) : null}
            </button>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {opportunity.already_interested ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200">
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
