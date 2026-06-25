import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import type { DecisionLogDensity } from "@/components/decision-log/DensityToggle";
import type { ValidationCategory } from "@/services/validations.api";
import type { ValidationDedupEntry } from "@/lib/manager-validations-list-utils";
import { validationDetailHref } from "@/lib/manager-validations-list-utils";
import { timeAgo } from "@/utils/decisionLogHelpers";
import { cx } from "@/utils/cx";
import { validationTypeBadge, validationTypeLabel } from "./validation-ui";
import { ValidationActionDialog } from "./ValidationActionDialog";

type ValidationItemProps = {
    entry: ValidationDedupEntry;
    bucket: ValidationCategory;
    density: DecisionLogDensity;
    onShowDuplicates?: (entry: ValidationDedupEntry) => void;
};

function readConfidence(payload: Record<string, unknown> | undefined): number | null {
    const raw = payload?.confidence ?? payload?.confidence_pct;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n > 0 && n <= 1) return n;
    if (n > 1 && n <= 100) return n / 100;
    return null;
}

export function ValidationItem({ entry, bucket, density, onShowDuplicates }: ValidationItemProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { item, count } = entry;
    const padding = density === "compact" ? "px-4 py-2.5" : "px-4 py-3.5";
    const typeKey = item.type;
    const badgeClass = validationTypeBadge[typeKey] ?? "border-secondary bg-secondary_subtle text-secondary";
    const typeLabel = validationTypeLabel[typeKey] ?? item.type_label;
    const confidence = readConfidence(item.payload);
    const reason =
        bucket === "conflict"
            ? item.why
            : bucket === "missing_justification"
              ? item.why
              : null;

    return (
        <>
            <div className={cx("group flex items-center gap-3 transition-colors hover:bg-secondary_subtle/50", padding)}>
                {item.priority_score != null ? (
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary_subtle"
                        title="Score de priorité (0–100)"
                    >
                        <span className="text-sm font-semibold tabular-nums text-primary">{item.priority_score}</span>
                    </div>
                ) : null}

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <span className={cx("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase", badgeClass)}>
                        {typeLabel}
                    </span>
                    {count > 1 ? (
                        <button
                            type="button"
                            onClick={() => onShowDuplicates?.(entry)}
                            className="rounded-md border border-secondary bg-secondary_subtle px-2 py-0.5 text-[10px] font-semibold tabular-nums text-secondary hover:bg-secondary_subtle/80"
                            title={`${count} occurrences identiques regroupées`}
                        >
                            × {count}
                        </button>
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">
                        {item.project_name || item.type_label}
                        {item.talent_name ? (
                            <span className="font-normal text-tertiary"> · {item.talent_name}</span>
                        ) : null}
                    </p>
                    <p className="truncate text-xs text-tertiary">{reason || item.why || "—"}</p>
                </div>

                {bucket === "standard" && confidence != null ? (
                    <div className="hidden shrink-0 flex-col items-end md:flex">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-tertiary">Conf.</span>
                        <span className="text-sm font-medium tabular-nums text-primary">{Math.round(confidence * 100)}%</span>
                    </div>
                ) : null}

                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-tertiary" title={item.created_at}>
                    {timeAgo(item.created_at)}
                </span>

                <Button
                    type="button"
                    color={bucket === "conflict" ? "primary" : "secondary"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setDialogOpen(true)}
                >
                    Traiter
                </Button>
            </div>

            <ValidationActionDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                entry={entry}
                detailHref={validationDetailHref(item)}
            />
        </>
    );
}
