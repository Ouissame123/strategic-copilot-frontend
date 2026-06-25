import type { ValidationCategory } from "@/services/validations.api";
import { cx } from "@/utils/cx";
import { validationCardClass } from "./validation-ui";

type BucketDistributionBarProps = {
    conflicts: number;
    missingJustif: number;
    standard: number;
    onSelectBucket: (bucket?: ValidationCategory) => void;
    activeBucket?: ValidationCategory;
};

export function BucketDistributionBar({
    conflicts,
    missingJustif,
    standard,
    onSelectBucket,
    activeBucket,
}: BucketDistributionBarProps) {
    const total = conflicts + missingJustif + standard;
    if (!total) return null;

    const buckets = [
        { key: "conflict" as const, label: "Bloquant", count: conflicts, color: "bg-red-500" },
        { key: "missing_justification" as const, label: "Justif manquante", count: missingJustif, color: "bg-amber-500" },
        { key: "standard" as const, label: "Standard", count: standard, color: "bg-slate-400" },
    ];

    return (
        <div className={validationCardClass + " p-4"}>
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary_subtle">
                {buckets.map(
                    (b) =>
                        b.count > 0 && (
                            <button
                                key={b.key}
                                type="button"
                                onClick={() => onSelectBucket(activeBucket === b.key ? undefined : b.key)}
                                className={cx(
                                    b.color,
                                    "transition-all hover:opacity-80",
                                    activeBucket === b.key && "ring-2 ring-brand-secondary ring-offset-1",
                                )}
                                style={{ width: `${(b.count / total) * 100}%` }}
                                title={`${b.label}: ${b.count}`}
                                aria-label={`Filtrer par ${b.label}`}
                            />
                        ),
                )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {buckets.map((b) => (
                    <button
                        key={b.key}
                        type="button"
                        onClick={() => onSelectBucket(activeBucket === b.key ? undefined : b.key)}
                        className={cx(
                            "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:bg-secondary_subtle/80",
                            activeBucket === b.key && "bg-secondary_subtle",
                        )}
                    >
                        <span className={cx("size-2 rounded-full", b.color)} />
                        <span className="text-primary">{b.label}</span>
                        <span className="tabular-nums text-tertiary">{b.count}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
