import { httpClient } from "@/lib/http-client";
import { webhookPath } from "@/lib/n8n-webhook-path";

/**
 * POST pending-validations (Helper / Agent 6).
 * Path logique : `/api/helper/pending-validations`
 * Résolu via `webhookPath` → `/api/helper/pending-validations` (proxy Vite local)
 * ou `/webhook/api/helper/pending-validations` (hôte n8n prod).
 * Ne pas envoyer `project_id`.
 */
export const PENDING_VALIDATIONS_LOGICAL_PATH = "/api/helper/pending-validations";
export const COPILOT_VALIDATIONS_PATH = PENDING_VALIDATIONS_LOGICAL_PATH;

export type ValidationTier = "conflict" | "missing_justification" | "standard";

/** @deprecated Alias — préférer `ValidationTier`. */
export type ValidationCategory = ValidationTier;

export type PendingValidation = {
    id: string;
    request_type: string;
    title: string;
    talent_name: string;
    priority: string;
    tier: ValidationTier;
    reason: string;
    days_pending: number;
};

export type PendingValidationsCounts = {
    conflict: number;
    missing_justification: number;
    standard: number;
};

export type PendingValidationsRequest = {
    enterprise_id: string;
    manager_user_id: string | null;
};

export type PendingValidationsResponse = {
    status: string;
    total: number;
    counts: PendingValidationsCounts;
    pending_validations: PendingValidation[];
};

/** @deprecated Ancien résumé — utiliser `counts` + `total`. */
export type ValidationsSummary = {
    total_pending: number;
    conflict_count: number;
    missing_justification_count: number;
    standard_count: number;
};

export type ValidationsListParams = PendingValidationsRequest;

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown, fallback = ""): string {
    if (v == null) return fallback;
    const s = String(v).trim();
    return s || fallback;
}

function num(v: unknown, fallback = 0): number {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeTier(raw: unknown): ValidationTier {
    const t = str(raw).toLowerCase();
    if (t === "conflict") return "conflict";
    if (t === "missing_justification" || t === "missing_justif") return "missing_justification";
    return "standard";
}

function normalizeItem(raw: unknown): PendingValidation | null {
    const r = asRecord(raw);
    const id = str(r.id);
    if (!id) return null;
    return {
        id,
        request_type: str(r.request_type),
        title: str(r.title),
        talent_name: str(r.talent_name, "—"),
        priority: str(r.priority),
        tier: normalizeTier(r.tier ?? r.category),
        reason: str(r.reason ?? r.why),
        days_pending: num(r.days_pending, 0),
    };
}

function normalizeResponse(data: unknown): PendingValidationsResponse {
    const root = asRecord(data);
    const countsRaw = asRecord(root.counts);
    const listRaw = Array.isArray(root.pending_validations) ? root.pending_validations : [];
    const pending_validations = listRaw.map(normalizeItem).filter((x): x is PendingValidation => x != null);
    const counts: PendingValidationsCounts = {
        conflict: num(countsRaw.conflict),
        missing_justification: num(countsRaw.missing_justification),
        standard: num(countsRaw.standard),
    };
    const total = num(root.total, pending_validations.length);
    return {
        status: str(root.status, "success"),
        total,
        counts,
        pending_validations,
    };
}

export const validationsApi = {
    list: async (body: PendingValidationsRequest) => {
        const path = webhookPath(PENDING_VALIDATIONS_LOGICAL_PATH);
        const { data } = await httpClient.post<unknown>(path, {
            enterprise_id: body.enterprise_id,
            manager_user_id: body.manager_user_id,
        });
        return { data: normalizeResponse(data) };
    },
};
