import { isAxiosError } from "axios";
import { getJwtEnterpriseId, getJwtUserId } from "@/auth/jwt";
import {
    getManagerProjectBudgetGetUrl,
    getManagerProjectBudgetHistoryUrl,
    getManagerProjectBudgetPatchUrl,
    getManagerProjectBudgetResetUrl,
} from "@/config/manager-project-budget-api.config";
import { computeOptimisticBudgetZone, isProjectBudgetFrozen } from "@/lib/project-budget-utils";
import { httpClient } from "@/lib/http-client";
import type {
    BudgetZone,
    ManagerProjectBudgetAdjustment,
    ManagerProjectBudgetBreakdownLine,
    ManagerProjectBudgetDetail,
    ManagerProjectBudgetHistory,
    ManagerProjectBudgetSnapshot,
} from "@/types/manager-project-budget.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const BUDGET_ZONES: BudgetZone[] = ["unset", "green", "amber", "orange", "red"];

function readNum(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function readStr(v: unknown, fallback = ""): string {
    return v != null && String(v).trim() ? String(v).trim() : fallback;
}

function readZone(v: unknown): BudgetZone {
    const s = String(v ?? "").trim().toLowerCase();
    return BUDGET_ZONES.includes(s as BudgetZone) ? (s as BudgetZone) : "unset";
}

function normalizeBreakdownLine(raw: unknown): ManagerProjectBudgetBreakdownLine {
    const r = asRecord(raw);
    return {
        talent_id: readStr(r.talent_id),
        talent_name: readStr(r.talent_name, "Talent"),
        allocation_pct: readNum(r.allocation_pct),
        cost_planned: readNum(r.cost_planned),
        cost_actual: readNum(r.cost_actual),
    };
}

function normalizeBudget(raw: unknown, projectStatus: string): ManagerProjectBudgetSnapshot {
    const r = asRecord(raw);
    const planned = readNum(r.budget_rh_planned ?? r.planned);
    const actual = readNum(r.budget_rh_actual ?? r.actual);
    const remaining = readNum(r.budget_rh_remaining ?? r.remaining, planned - actual);
    const consumptionPct = readNum(r.consumption_pct ?? r.consumed_pct, planned > 0 ? Math.round((actual / planned) * 100) : 0);
    const zoneRaw = r.zone ?? r.budget_zone;
    const zone = zoneRaw != null ? readZone(zoneRaw) : computeOptimisticBudgetZone(planned, actual).zone;
    const badge = readStr(r.badge, computeOptimisticBudgetZone(planned, actual).badge);
    const frozenRaw = r.is_frozen ?? r.frozen;
    const isFrozen =
        frozenRaw != null
            ? Boolean(frozenRaw)
            : isProjectBudgetFrozen(projectStatus) || readBool(r.is_editable) === false;

    return {
        budget_rh_planned: planned,
        budget_rh_actual: actual,
        budget_rh_remaining: remaining,
        consumption_pct: consumptionPct,
        currency: readStr(r.currency, "EUR"),
        zone,
        badge,
        is_frozen: isFrozen,
    };
}

function readBool(v: unknown): boolean | null {
    if (v == null) return null;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
    return null;
}

function normalizeAdjustment(raw: unknown): ManagerProjectBudgetAdjustment {
    const r = asRecord(raw);
    return {
        adjustment_id: readStr(r.adjustment_id ?? r.id),
        change_type: readStr(r.change_type, "manual_edit"),
        amount_before: readNum(r.amount_before),
        amount_after: readNum(r.amount_after),
        delta: readNum(r.delta, readNum(r.amount_after) - readNum(r.amount_before)),
        currency: readStr(r.currency, "EUR"),
        reason: readStr(r.reason),
        adjusted_at: readStr(r.adjusted_at ?? r.created_at),
        adjusted_by_id: readStr(r.adjusted_by_id ?? r.adjusted_by),
        adjusted_by_name: readStr(r.adjusted_by_name, "Utilisateur"),
    };
}

function normalizeDetail(data: unknown, projectId: string): ManagerProjectBudgetDetail {
    const root = unwrapN8nRoot(data);
    const projectStatus = readStr(root.project_status ?? asRecord(root.project).status);
    const budgetRaw = root.budget ?? root;
    const breakdownRaw = root.breakdown ?? root.lines ?? root.team_breakdown;
    const breakdown = Array.isArray(breakdownRaw) ? breakdownRaw.map(normalizeBreakdownLine) : [];

    return {
        success: true,
        project_id: readStr(root.project_id, projectId),
        project_name: readStr(root.project_name ?? asRecord(root.project).name),
        project_status: projectStatus,
        budget: normalizeBudget(budgetRaw, projectStatus),
        breakdown,
    };
}

export function getManagerProjectBudgetErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const root = unwrapN8nRoot(data);
        const code = root.code ?? (data as Record<string, unknown>).code;
        if (code != null) return String(code).trim().toUpperCase();
    }
    return undefined;
}

export const managerProjectBudgetApi = {
    get: async (project_id: string): Promise<ManagerProjectBudgetDetail> => {
        const id = project_id.trim();
        const { data } = await httpClient.get<unknown>(getManagerProjectBudgetGetUrl(id), {
            params: { enterprise_id: getJwtEnterpriseId() ?? "" },
            skipGlobalHttpErrorToast: true,
        });
        return normalizeDetail(data, id);
    },

    patch: async (p: { project_id: string; budget_rh_planned: number; reason: string; currency?: string }) => {
        const body = {
            enterprise_id: getJwtEnterpriseId() ?? "",
            adjusted_by: getJwtUserId() ?? "",
            budget_rh_planned: p.budget_rh_planned,
            reason: p.reason.trim(),
            currency: p.currency ?? "EUR",
        };
        const { data } = await httpClient.patch<unknown>(getManagerProjectBudgetPatchUrl(p.project_id), body, {
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

    reset: async (p: { project_id: string; reason?: string }) => {
        const body = {
            enterprise_id: getJwtEnterpriseId() ?? "",
            adjusted_by: getJwtUserId() ?? "",
            reason: p.reason?.trim() || "Réinitialisation budget",
        };
        const { data } = await httpClient.post<unknown>(getManagerProjectBudgetResetUrl(p.project_id), body, {
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        return normalizeDetail(root.detail ?? root, p.project_id);
    },

    history: async (project_id: string, limit = 50): Promise<ManagerProjectBudgetHistory> => {
        const id = project_id.trim();
        const { data } = await httpClient.get<unknown>(getManagerProjectBudgetHistoryUrl(id), {
            params: { enterprise_id: getJwtEnterpriseId() ?? "", limit },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const adjustmentsRaw = root.adjustments ?? root.history ?? root.entries;
        const adjustments = Array.isArray(adjustmentsRaw) ? adjustmentsRaw.map(normalizeAdjustment) : [];
        return {
            success: true,
            count: readNum(root.count, adjustments.length),
            adjustments,
        };
    },
};
