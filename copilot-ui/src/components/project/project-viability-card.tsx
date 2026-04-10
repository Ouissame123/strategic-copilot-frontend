import type { ProjectViability as ProjectViabilityType } from "@/hooks/use-project";
import { getDecisionConfig } from "@/utils/decisionConfig";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

export interface ProjectViabilityCardProps {
    viability: ProjectViabilityType | null;
    className?: string;
}

export function ProjectViabilityCard({ viability, className }: ProjectViabilityCardProps) {
    if (!viability) return null;

    const config = getDecisionConfig(viability.decision);

    return (
        <section
            className={cx(
                "rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6",
                className,
            )}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Score de viabilité</h2>
                    <p className="mt-1 text-sm text-tertiary">Décision IA et justification.</p>
                </div>
                <BadgeWithDot type="pill-color" size="md" color={config.badgeColor}>
                    {config.label}
                </BadgeWithDot>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm font-medium text-tertiary">Score (0–10)</p>
                    <p className="mt-1 text-display-xs font-semibold text-primary">{viability.viability_score.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm font-medium text-tertiary">Décision</p>
                    <p className={cx("mt-1 text-md font-semibold", config.color === "success" && "text-success-primary", config.color === "warning" && "text-warning-primary", config.color === "error" && "text-error-primary")}>
                        {viability.decision}
                    </p>
                </div>
            </div>

            {viability.explanation && (
                <div className="mt-6 rounded-lg border border-secondary bg-primary p-4">
                    <p className="text-sm font-medium text-secondary">Justification IA</p>
                    <p className="mt-2 text-sm text-tertiary">{viability.explanation}</p>
                </div>
            )}

            {viability.recommendation?.summary && (
                <div className="mt-4 rounded-lg border border-secondary p-4">
                    <p className="text-sm font-medium text-secondary">Recommandation</p>
                    <p className="mt-2 text-sm text-tertiary">{viability.recommendation.summary}</p>
                </div>
            )}
        </section>
    );
}
