import { useMemo, type ReactNode } from "react";
import type { DecisionLogDecision, DecisionStatusAction } from "@/services/decisions.api";
import {
    bucketByDate,
    DATE_BUCKET_LABELS,
    DATE_BUCKET_ORDER,
    type DateBucketKey,
} from "@/utils/decisionLogHelpers";
import { DecisionHistoryItem } from "./DecisionHistoryItem";
import type { DecisionLogDensity } from "./DensityToggle";
import { decisionLogCardClass } from "./decision-log-ui";

type DecisionHistoryListProps = {
    items: DecisionLogDecision[];
    density: DecisionLogDensity;
    title: string;
    onOpenProject: (projectId: string) => void;
    onUpdateStatus: (decisionId: string, action: DecisionStatusAction) => void;
    statusUpdatingDecisionId: string | null;
    onDelete: (decisionId: string) => void;
    deletingDecisionId: string | null;
    footer?: ReactNode;
};

export function DecisionHistoryList({
    items,
    density,
    title,
    onOpenProject,
    onUpdateStatus,
    statusUpdatingDecisionId,
    onDelete,
    deletingDecisionId,
    footer,
}: DecisionHistoryListProps) {
    const grouped = useMemo(() => bucketByDate(items), [items]);

    const groups = DATE_BUCKET_ORDER.filter((key) => grouped[key].length > 0).map((key) => ({
        key,
        label: DATE_BUCKET_LABELS[key as DateBucketKey],
        items: grouped[key],
    }));

    return (
        <div className={decisionLogCardClass}>
            <div className="flex items-baseline justify-between border-b border-secondary/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-primary">{title}</h2>
                <span className="text-xs tabular-nums text-tertiary">
                    {items.length} résultat{items.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div>
                {groups.map((group) => (
                    <div key={group.key}>
                        <div className="sticky top-[8.75rem] z-[5] border-b border-secondary/40 bg-primary/95 px-4 py-2 backdrop-blur-sm">
                            <span className="text-xs font-medium uppercase tracking-wider text-tertiary">
                                {group.label}{" "}
                                <span className="tabular-nums text-secondary">({group.items.length})</span>
                            </span>
                        </div>
                        <div>
                            {group.items.map((d) => (
                                <DecisionHistoryItem
                                    key={d.decision_id}
                                    decision={d}
                                    density={density}
                                    onOpenProject={() => onOpenProject(d.project_id)}
                                    onUpdateStatus={(action) => onUpdateStatus(d.decision_id, action)}
                                    statusUpdating={statusUpdatingDecisionId === d.decision_id}
                                    onDelete={() => onDelete(d.decision_id)}
                                    deleting={deletingDecisionId === d.decision_id}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {footer}
        </div>
    );
}
