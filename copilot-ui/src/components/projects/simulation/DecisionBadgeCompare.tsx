import { ArrowRight } from "lucide-react";
import type { ViabilityDecision } from "@/api/whatif.types";
import { cx } from "@/utils/cx";

const DECISION_STYLES: Record<string, string> = {
    Proceed: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    Adjust: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    Reject: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    // Legacy aliases
    GO: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    Continue: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    NO_GO: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    Stop: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    CONDITIONAL: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    Unknown: "border-secondary bg-secondary_subtle text-fg-tertiary",
};

type DecisionBadgeCompareProps = {
    before: ViabilityDecision | null;
    after: ViabilityDecision;
};

export function DecisionBadge({ value, className }: { value: string; className?: string }) {
    const key = value.trim();
    return (
        <span
            className={cx(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                DECISION_STYLES[key] ?? DECISION_STYLES.Unknown,
                className,
            )}
        >
            {key || "—"}
        </span>
    );
}

export function DecisionBadgeCompare({ before, after }: DecisionBadgeCompareProps) {
    const b = before ?? "Unknown";
    const a = after ?? "Unknown";

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label="Comparaison décision avant et après simulation">
            <span className="text-sm text-fg-tertiary">Décision :</span>
            <DecisionBadge value={String(b)} />
            <ArrowRight className="size-3 text-fg-quaternary" aria-hidden />
            <DecisionBadge value={String(a)} />
        </div>
    );
}
