import { Check } from "lucide-react";
import { formatOpportunityScore } from "./talent-opportunities-ui";
import { cx } from "@/utils/cx";

type OpportunityScoreGaugesProps = {
    skillFitScore: number;
    availabilityScore: number;
    gapCount: number;
};

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary dark:bg-secondary" aria-hidden>
            <span
                className="absolute inset-y-0 left-0 rounded-full bg-brand-secondary"
                style={{ width: `${pct}%` }}
            />
        </span>
    );
}

export function OpportunityScoreGauges({
    skillFitScore,
    availabilityScore,
    gapCount,
}: OpportunityScoreGaugesProps) {
    const isImmediate = availabilityScore <= 0;
    const availabilityLabel = isImmediate ? "Immédiate" : formatOpportunityScore(availabilityScore);

    return (
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Scores de l'opportunité">
            <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[10px] font-medium leading-tight text-tertiary">Compatibilité compétences</p>
                <ScoreBar value={skillFitScore} />
                <p className="text-xs font-semibold tabular-nums text-primary">{formatOpportunityScore(skillFitScore)}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[10px] font-medium leading-tight text-tertiary">Disponibilité requise</p>
                <ScoreBar value={isImmediate ? 10 : availabilityScore} />
                <p
                    className={cx(
                        "text-xs font-semibold text-primary",
                        !isImmediate && "tabular-nums",
                    )}
                >
                    {availabilityLabel}
                </p>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[10px] font-medium leading-tight text-tertiary">Écarts</p>
                <div className="flex min-h-[1.375rem] items-center">
                    {gapCount <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50">
                            <Check className="size-3 shrink-0" aria-hidden />
                            Aucun écart
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50">
                            {gapCount} écart{gapCount > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
