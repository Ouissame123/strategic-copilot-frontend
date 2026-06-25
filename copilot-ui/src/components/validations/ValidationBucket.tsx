import { useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown, ListOrdered } from "lucide-react";
import type { ValidationCategory } from "@/services/validations.api";
import type { DecisionLogDensity } from "@/components/decision-log/DensityToggle";
import type { ValidationDedupEntry } from "@/lib/manager-validations-list-utils";
import { ValidationItem } from "./ValidationItem";
import { validationBucketConfig } from "./validation-ui";
import { cx } from "@/utils/cx";

const BUCKET_ICONS = {
    conflict: AlertCircle,
    missing_justification: AlertTriangle,
    standard: ListOrdered,
} as const;

const BUCKET_ICON_COLOR = {
    conflict: "text-red-500",
    missing_justification: "text-amber-500",
    standard: "text-slate-500",
} as const;

type ValidationBucketProps = {
    type: ValidationCategory;
    items: ValidationDedupEntry[];
    density: DecisionLogDensity;
    defaultExpanded?: boolean;
    onShowDuplicates?: (entry: ValidationDedupEntry) => void;
};

export function ValidationBucket({
    type,
    items,
    density,
    defaultExpanded = true,
    onShowDuplicates,
}: ValidationBucketProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const config = validationBucketConfig[type];
    const Icon = BUCKET_ICONS[type];

    if (!items.length) return null;

    return (
        <div className="border-b border-secondary/50 last:border-b-0">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary_subtle/40"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-3">
                    <span className={cx("h-6 w-1 rounded-full", config.indicator)} aria-hidden />
                    <Icon className={cx("size-4 shrink-0", BUCKET_ICON_COLOR[type])} aria-hidden />
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {config.label}{" "}
                            <span className="tabular-nums text-tertiary">({items.length})</span>
                        </h3>
                        <p className="text-xs text-tertiary">{config.description}</p>
                    </div>
                </div>
                <ChevronDown
                    className={cx("size-4 text-tertiary transition-transform", expanded && "rotate-180")}
                    aria-hidden
                />
            </button>

            {expanded ? (
                <div className="divide-y divide-secondary/40">
                    {items.map((entry) => (
                        <ValidationItem
                            key={entry.ids.join("-")}
                            entry={entry}
                            bucket={type}
                            density={density}
                            onShowDuplicates={onShowDuplicates}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
