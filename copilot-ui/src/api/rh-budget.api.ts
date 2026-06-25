import { isAxiosError } from "axios";
import { getJwtEnterpriseId, getJwtUserId } from "@/auth/jwt";
import {
    getRhBudgetDetailUrl,
    getRhBudgetEnvelopeUrl,
    getRhBudgetHistoryUrl,
    getRhBudgetListUrl,
    getRhBudgetSummaryUrl,
} from "@/config/rh-budget-api.config";
import { httpClient } from "@/lib/http-client";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const E = () => getJwtEnterpriseId();
const U = () => getJwtUserId();

export type BudgetStatus = "unset" | "ok" | "warning" | "critical" | "exceeded";

export type BudgetProject = {
    project_id: string;
    name: string;
    status: "planned" | "active" | "on_hold" | "completed";
    priority: number;
    milestone_at: string | null;
    budget_rh_planned: number;
    budget_rh_actual: number;
    budget_rh_remaining: number;
    consumption_pct: number;
    budget_status: BudgetStatus;
    currency: string;
    team_count: number;
    last_adjusted_at: string | null;
    last_reason: string | null;
    last_adjusted_by_id: string | null;
};

export type BudgetAdjustment = {
    adjustment_id: string;
    amount_before: number;
    amount_after: number;
    delta: number;
    currency: string;
    reason: string;
    adjusted_at: string;
    adjusted_by_id: string;
    adjusted_by_name: string;
};

export type BudgetSummary = {
    projects_total: number;
    projects_unset: number;
    projects_ok: number;
    projects_warning: number;
    projects_critical: number;
    projects_exceeded: number;
    total_planned: number;
    total_actual: number;
    total_remaining: number;
    global_consumption_pct: number;
    currency: string;
};

const BUDGET_STATUSES: BudgetStatus[] = ["unset", "ok", "warning", "critical", "exceeded"];
const PROJECT_STATUSES: BudgetProject["status"][] = ["planned", "active", "on_hold", "completed"];

function readNum(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function readStr(v: unknown, fallback = ""): string {
    return v != null && String(v).trim() ? String(v).trim() : fallback;
}

function readBudgetStatus(v: unknown): BudgetStatus {
    const s = String(v ?? "").trim().toLowerCase();
    return BUDGET_STATUSES.includes(s as BudgetStatus) ? (s as BudgetStatus) : "unset";
}

function readProjectStatus(v: unknown): BudgetProject["status"] {
    const s = String(v ?? "").trim().toLowerCase();
    return PROJECT_STATUSES.includes(s as BudgetProject["status"]) ? (s as BudgetProject["status"]) : "planned";
}

function normalizeProject(raw: unknown): BudgetProject {
    const r = asRecord(raw);
    return {
        project_id: readStr(r.project_id),
        name: readStr(r.name, "Projet"),
        status: readProjectStatus(r.status),
        priority: readNum(r.priority),
        milestone_at: r.milestone_at != null && String(r.milestone_at).trim() ? String(r.milestone_at) : null,
        budget_rh_planned: readNum(r.budget_rh_planned),
        budget_rh_actual: readNum(r.budget_rh_actual),
        budget_rh_remaining: readNum(r.budget_rh_remaining),
        consumption_pct: readNum(r.consumption_pct),
        budget_status: readBudgetStatus(r.budget_status),
        currency: readStr(r.currency, "EUR"),
        team_count: readNum(r.team_count),
        last_adjusted_at:
            r.last_adjusted_at != null && String(r.last_adjusted_at).trim() ? String(r.last_adjusted_at) : null,
        last_reason: r.last_reason != null && String(r.last_reason).trim() ? String(r.last_reason) : null,
        last_adjusted_by_id:
            r.last_adjusted_by_id != null && String(r.last_adjusted_by_id).trim()
                ? String(r.last_adjusted_by_id)
                : null,
    };
}

function normalizeAdjustment(raw: unknown): BudgetAdjustment {
    const r = asRecord(raw);
    return {
        adjustment_id: readStr(r.adjustment_id),
        amount_before: readNum(r.amount_before),
        amount_after: readNum(r.amount_after),
        delta: readNum(r.delta),
        currency: readStr(r.currency, "EUR"),
        reason: readStr(r.reason),
        adjusted_at: readStr(r.adjusted_at),
        adjusted_by_id: readStr(r.adjusted_by_id),
        adjusted_by_name: readStr(r.adjusted_by_name, "Utilisateur"),
    };
}

function normalizeSummary(raw: unknown): BudgetSummary {
    const r = asRecord(raw);
    return {
        projects_total: readNum(r.projects_total),
        projects_unset: readNum(r.projects_unset),
        projects_ok: readNum(r.projects_ok),
        projects_warning: readNum(r.projects_warning),
        projects_critical: readNum(r.projects_critical),
        projects_exceeded: readNum(r.projects_exceeded),
        total_planned: readNum(r.total_planned),
        total_actual: readNum(r.total_actual),
        total_remaining: readNum(r.total_remaining),
        global_consumption_pct: readNum(r.global_consumption_pct),
        currency: readStr(r.currency, "EUR"),
    };
}

export function getRhBudgetErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const root = unwrapN8nRoot(data);
        const code = root.code ?? (data as Record<string, unknown>).code;
        if (code != null) return String(code).trim().toUpperCase();
    }
    return undefined;
}

export const rhBudgetApi = {
    list: async (params?: {
        status?: string;
        budget_status?: BudgetStatus | "all";
        search?: string;
        limit?: number;
        offset?: number;
    }) => {
        const query: Record<string, string | number> = {
            enterprise_id: E() ?? "",
        };
        if (params?.status?.trim()) query.status = params.status.trim();
        if (params?.budget_status && params.budget_status !== "all") {
            query.budget_status = params.budget_status;
        }
        if (params?.search?.trim()) query.search = params.search.trim();
        if (params?.limit != null) query.limit = params.limit;
        if (params?.offset != null) query.offset = params.offset;

        const { data } = await httpClient.get<unknown>(getRhBudgetListUrl(), {
            params: query,
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const projectsRaw = root.projects;
        const projects = Array.isArray(projectsRaw) ? projectsRaw.map(normalizeProject) : [];
        return {
            success: true as const,
            count: readNum(root.count, projects.length),
            projects,
        };
    },

    detail: async (project_id: string) => {
        const { data } = await httpClient.get<unknown>(getRhBudgetDetailUrl(), {
            params: { enterprise_id: E() ?? "", project_id },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const project = normalizeProject(root.project ?? root);
        return {
            success: true as const,
            project: {
                ...project,
                adjustments_count: readNum(asRecord(root.project).adjustments_count ?? root.adjustments_count),
            },
        };
    },

    updateEnvelope: async (p: {
        project_id: string;
        budget_rh_planned: number;
        reason: string;
        currency?: string;
    }) => {
        const body = {
            enterprise_id: E() ?? "",
            adjusted_by: U() ?? "",
            project_id: p.project_id,
            budget_rh_planned: p.budget_rh_planned,
            reason: p.reason.trim(),
            currency: p.currency ?? "EUR",
        };
        const { data } = await httpClient.patch<unknown>(getRhBudgetEnvelopeUrl(), body, {
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const adjustment = normalizeAdjustment(root.adjustment ?? root);
        return {
            success: true as const,
            project_id: readStr(root.project_id, p.project_id),
            budget_rh_planned: readNum(root.budget_rh_planned, p.budget_rh_planned),
            currency: readStr(root.currency, p.currency ?? "EUR"),
            adjustment,
        };
    },

    history: async (project_id: string, limit = 50) => {
        const { data } = await httpClient.get<unknown>(getRhBudgetHistoryUrl(), {
            params: { enterprise_id: E() ?? "", project_id, limit },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const adjustmentsRaw = root.adjustments;
        const adjustments = Array.isArray(adjustmentsRaw) ? adjustmentsRaw.map(normalizeAdjustment) : [];
        return {
            success: true as const,
            count: readNum(root.count, adjustments.length),
            adjustments,
        };
    },

    summary: async () => {
        const { data } = await httpClient.get<unknown>(getRhBudgetSummaryUrl(), {
            params: { enterprise_id: E() ?? "" },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        return {
            success: true as const,
            summary: normalizeSummary(root.summary ?? root),
        };
    },
};
