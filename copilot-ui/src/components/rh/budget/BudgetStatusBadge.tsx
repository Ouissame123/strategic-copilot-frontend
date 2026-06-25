import type { BudgetStatus } from "@/api/rh-budget.api";
import { cx } from "@/utils/cx";
import { BADGE_BY_STATUS, LABEL_BY_STATUS } from "./budget-utils";

type BudgetStatusBadgeProps = {
    status: BudgetStatus;
};

export function BudgetStatusBadge({ status }: BudgetStatusBadgeProps) {
    return (
        <span
            className={cx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                BADGE_BY_STATUS[status],
            )}
        >
            {LABEL_BY_STATUS[status]}
        </span>
    );
}
