import {
    RH_BUDGET_DETAIL_URL_DEV,
    RH_BUDGET_DETAIL_URL_PRODUCTION,
    RH_BUDGET_ENVELOPE_URL_DEV,
    RH_BUDGET_ENVELOPE_URL_PRODUCTION,
    RH_BUDGET_HISTORY_URL_DEV,
    RH_BUDGET_HISTORY_URL_PRODUCTION,
    RH_BUDGET_LIST_URL_DEV,
    RH_BUDGET_LIST_URL_PRODUCTION,
    RH_BUDGET_SUMMARY_URL_DEV,
    RH_BUDGET_SUMMARY_URL_PRODUCTION,
} from "@/api/rh-budget.constants";

function readEnvUrl(key: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function resolveUrl(envKey: string, prod: string, dev: string): string {
    return readEnvUrl(envKey) ?? (import.meta.env.PROD ? prod : dev);
}

/** GET `/webhook/rh/projects/budget` */
export function getRhBudgetListUrl(): string {
    return resolveUrl("VITE_RH_BUDGET_LIST_URL", RH_BUDGET_LIST_URL_PRODUCTION, RH_BUDGET_LIST_URL_DEV);
}

/** GET `/webhook/rh/projects/budget/detail` */
export function getRhBudgetDetailUrl(): string {
    return resolveUrl("VITE_RH_BUDGET_DETAIL_URL", RH_BUDGET_DETAIL_URL_PRODUCTION, RH_BUDGET_DETAIL_URL_DEV);
}

/** PATCH `/webhook/rh/projects/budget/envelope` */
export function getRhBudgetEnvelopeUrl(): string {
    return resolveUrl("VITE_RH_BUDGET_ENVELOPE_URL", RH_BUDGET_ENVELOPE_URL_PRODUCTION, RH_BUDGET_ENVELOPE_URL_DEV);
}

/** GET `/webhook/rh/projects/budget/history` */
export function getRhBudgetHistoryUrl(): string {
    return resolveUrl("VITE_RH_BUDGET_HISTORY_URL", RH_BUDGET_HISTORY_URL_PRODUCTION, RH_BUDGET_HISTORY_URL_DEV);
}

/** GET `/webhook/rh/projects/budget/summary` */
export function getRhBudgetSummaryUrl(): string {
    return resolveUrl("VITE_RH_BUDGET_SUMMARY_URL", RH_BUDGET_SUMMARY_URL_PRODUCTION, RH_BUDGET_SUMMARY_URL_DEV);
}
