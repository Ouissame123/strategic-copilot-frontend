export type BudgetZone = "unset" | "green" | "amber" | "orange" | "red";

export type BudgetChangeType = "manual_edit" | "auto_recompute" | "reset" | "initial";

export type ManagerProjectBudgetSnapshot = {
    budget_rh_planned: number;
    budget_rh_actual: number;
    budget_rh_remaining: number;
    consumption_pct: number;
    currency: string;
    zone: BudgetZone;
    badge: string;
    is_frozen: boolean;
};

export type ManagerProjectBudgetBreakdownLine = {
    talent_id: string;
    talent_name: string;
    allocation_pct: number;
    cost_planned: number;
    cost_actual: number;
};

export type ManagerProjectBudgetAdjustment = {
    adjustment_id: string;
    change_type: BudgetChangeType | string;
    amount_before: number;
    amount_after: number;
    delta: number;
    currency: string;
    reason: string;
    adjusted_at: string;
    adjusted_by_id: string;
    adjusted_by_name: string;
};

export type ManagerProjectBudgetDetail = {
    success: true;
    project_id: string;
    project_name: string;
    project_status: string;
    budget: ManagerProjectBudgetSnapshot;
    breakdown: ManagerProjectBudgetBreakdownLine[];
};

export type ManagerProjectBudgetHistory = {
    success: true;
    count: number;
    adjustments: ManagerProjectBudgetAdjustment[];
};
