import { ApiError } from "@/api/errors";
import type { RhRequestsSummary } from "@/api/rh-requests-decision.api";
import type { RhRequestsListResponse } from "@/api/rh-requests-decision.api";
import type { RhActionItem } from "@/types/manager-rh-actions.types";
import type { RhRequest } from "@/types/rh-requests.types";
import { asRecord } from "@/utils/unwrap-api-payload";

/** Bucket UI interne (filtres / KPI). */
export type RhRequestStatusBucket = "pending" | "accepted" | "in_progress" | "done" | "rejected" | "closed" | "cancelled";

export const RH_REQUEST_STATUS_BUCKETS: RhRequestStatusBucket[] = [
    "pending",
    "accepted",
    "in_progress",
    "done",
    "rejected",
];

/** Parse GET `/rh/requests` (WF_RH_Requests_Decision). */
export function parseRhRequestsListResponse(raw: unknown): RhRequestsListResponse {
    const root = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const items = Array.isArray(root.items) ? (root.items as unknown[]) : [];
    const normalized = items.map(normalizeRhRequest).filter((x) => x.id);
    return {
        status: String(root.status ?? "success"),
        workflow: String(root.workflow ?? "WF_RH_Requests_Decision"),
        action: String(root.action ?? "list"),
        count: Number(root.count) || normalized.length,
        items: normalized,
    };
}

/** Parse GET `/rh/requests/summary` (WF_RH_Requests_Decision). */
export function parseRhRequestsSummary(raw: unknown): RhRequestsSummary {
    const root = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const summary = asRecord(root.summary ?? root.data ?? root);
    return {
        total: Number(summary.total ?? 0),
        open: summary.open != null ? Number(summary.open) : undefined,
        pending: summary.pending != null ? Number(summary.pending) : undefined,
        urgent: summary.urgent != null ? Number(summary.urgent) : undefined,
        stale_14d: summary.stale_14d != null ? Number(summary.stale_14d) : undefined,
        in_progress: Number(summary.in_progress ?? 0),
        done: Number(summary.done ?? 0),
        rejected: Number(summary.rejected ?? 0),
        accepted: summary.accepted != null ? Number(summary.accepted) : undefined,
        cancelled: summary.cancelled != null ? Number(summary.cancelled) : undefined,
        done_7d: summary.done_7d != null ? Number(summary.done_7d) : undefined,
    };
}

function nullishStr(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
}

function parsePayload(v: unknown): Record<string, unknown> {
    if (v == null) return {};
    if (typeof v === "string") {
        try {
            const parsed = JSON.parse(v) as unknown;
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
        } catch {
            return {};
        }
    }
    if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    return {};
}

/** Normalise un item LIST ou DETAIL (`request.project_name` aplati, pas d'objet `project`). */
export function normalizeRhRequest(row: unknown): RhRequest {
    const r = asRecord(row);
    const manager_user_id = nullishStr(r.manager_user_id ?? r.manager_id);
    const description = String(r.description ?? r.message ?? "").trim();
    const message = String(r.message ?? r.description ?? "").trim();

    return {
        id: String(r.id ?? "").trim(),
        enterprise_id: String(r.enterprise_id ?? "").trim() || undefined,
        manager_user_id,
        manager_name: nullishStr(r.manager_name),
        manager_id: manager_user_id ?? "",
        project_id: nullishStr(r.project_id),
        project_name: nullishStr(r.project_name),
        project_status: nullishStr(r.project_status),
        assigned_to: nullishStr(r.assigned_to),
        assigned_to_name: nullishStr(r.assigned_to_name),
        type: String(r.type ?? "").trim(),
        type_label: nullishStr(r.type_label ?? r.typeLabel),
        title: String(r.title ?? r.subject ?? r.request_title ?? "").trim(),
        description,
        message: message || description,
        priority: String(r.priority ?? "normal").trim(),
        status: String(r.status ?? "pending").trim(),
        status_label: nullishStr(r.status_label ?? r.statusLabel),
        response_message: nullishStr(r.response_message ?? r.responseMessage),
        payload: parsePayload(r.payload),
        days_since_creation:
            typeof r.days_since_creation === "number" && Number.isFinite(r.days_since_creation)
                ? r.days_since_creation
                : null,
        created_at: String(r.created_at ?? r.createdAt ?? "").trim(),
        updated_at: String(r.updated_at ?? r.updatedAt ?? "").trim(),
        completed_at: nullishStr(r.completed_at ?? r.completedAt),
    };
}

export function rhRequestToRow(item: RhRequest): Record<string, unknown> & { id: string } {
    return {
        ...item,
        id: item.id,
        state: item.status,
        statusLabel: item.status_label,
        typeLabel: item.type_label,
        createdAt: item.created_at,
        responseMessage: item.response_message,
        reason: item.response_message,
    };
}

/** @deprecated Utiliser `rhRequestToRow`. */
export function rhActionItemToRow(item: RhActionItem | RhRequest): Record<string, unknown> & { id: string } {
    if ("project_name" in item || "title" in item) {
        return rhRequestToRow(item as RhRequest);
    }
    return {
        ...item,
        id: item.id,
        state: item.status,
        createdAt: item.created_at,
        responseMessage: item.response_message,
        reason: item.response_message,
    };
}

function fingerprintStatus(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

/** Statut API (EN/FR legacy) → bucket UI. */
export function rhRequestStatusToBucket(raw: unknown): RhRequestStatusBucket | null {
    const s = fingerprintStatus(String(raw ?? ""));
    if (!s) return "pending";

    if (s === "en_attente" || s === "pending" || s === "open" || s === "new") {
        return "pending";
    }
    if (s === "acceptee" || s === "accepted" || s === "approved" || s === "approve") {
        return "accepted";
    }
    if (s === "en_cours" || s === "in_progress" || s === "inprogress" || s === "progress") {
        return "in_progress";
    }
    if (s === "terminee" || s === "done" || s === "completed") {
        return "done";
    }
    if (s === "closed" || s === "cloturee" || s === "cloture") {
        return "closed";
    }
    if (s === "cancelled" || s === "canceled" || s === "annulee") {
        return "cancelled";
    }
    if (s === "rejetee" || s === "rejected" || s === "refused" || s === "refusee" || s === "declined") {
        return "rejected";
    }
    return null;
}

/** Bucket UI → paramètre `status` GET `/rh/requests`. */
export function rhRequestBucketToApiStatus(bucket: RhRequestStatusBucket): string {
    return bucket;
}

/** Libellé affiché — préférer `status_label` backend passé en second argument. */
export function labelRhRequestStatus(raw: unknown, statusLabelFromBackend?: unknown): string {
    const backend = statusLabelFromBackend != null ? String(statusLabelFromBackend).trim() : "";
    if (backend) return backend;
    const rawStr = String(raw ?? "").trim();
    if (rawStr) return rawStr.replace(/_/g, " ");
    return "—";
}

export function mapRhRequestsDecisionError(err: unknown): string {
    if (err instanceof ApiError) {
        const payload = err.payload;
        const msg =
            payload && typeof payload === "object" && !Array.isArray(payload)
                ? String((payload as Record<string, unknown>).message ?? (payload as Record<string, unknown>).error ?? "")
                : "";
        if (err.status === 401) {
            return msg || "Session expirée ou token manquant. Reconnectez-vous.";
        }
        if (err.status === 403) {
            return msg || "Accès réservé au rôle RH.";
        }
        if (err.status === 400) return msg || "Données invalides.";
        if (err.status === 404) return msg || "Demande RH introuvable.";
        if (err.status === 422) return msg || "Opération non autorisée pour ce statut.";
        if (msg) return msg;
        return err.message;
    }
    return err instanceof Error ? err.message : "Erreur lors de l’appel au workflow RH.";
}

export function readRhRequestField(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
}

export function readRhRequestProjectName(row: Record<string, unknown>): string {
    return readRhRequestField(row, ["project_name", "projectName"]);
}

export function readRhRequestProjectId(row: Record<string, unknown>): string {
    return readRhRequestField(row, ["project_id", "projectId"]);
}
