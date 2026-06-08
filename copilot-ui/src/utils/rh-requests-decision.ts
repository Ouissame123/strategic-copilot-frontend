import { ApiError } from "@/api/errors";
import {
    RH_REQUEST_API_STATUS,
    RH_REQUEST_STATUS_LABELS,
    type RhRequestApiStatus,
} from "@/api/rh-requests-decision.constants";
import type { RhRequestsListResponse } from "@/api/rh-requests-decision.api";
import type { RhActionItem } from "@/types/manager-rh-actions.types";
import { normalizeRhActionItem } from "@/utils/rh-actions-workflow";

/** Bucket UI interne (filtres / KPI). */
export type RhRequestStatusBucket = "pending" | "accepted" | "in_progress" | "done" | "rejected";

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
    const normalized = items.map(normalizeRhActionItem).filter((x) => x.id);
    return {
        status: String(root.status ?? "success"),
        workflow: String(root.workflow ?? "WF_RH_Requests_Decision"),
        action: String(root.action ?? "list"),
        count: Number(root.count) || normalized.length,
        items: normalized,
    };
}

export function rhActionItemToRow(item: RhActionItem): Record<string, unknown> & { id: string } {
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

/** Statut API (français ou legacy EN) → bucket UI. */
export function rhRequestStatusToBucket(raw: unknown): RhRequestStatusBucket | null {
    const s = fingerprintStatus(String(raw ?? ""));
    if (!s) return "pending";

    if (s === RH_REQUEST_API_STATUS.pending || s === "en_attente" || s === "pending" || s === "open" || s === "new") {
        return "pending";
    }
    if (s === RH_REQUEST_API_STATUS.accepted || s === "acceptee" || s === "accepted" || s === "approved" || s === "approve") {
        return "accepted";
    }
    if (s === RH_REQUEST_API_STATUS.in_progress || s === "en_cours" || s === "in_progress" || s === "inprogress" || s === "progress") {
        return "in_progress";
    }
    if (s === RH_REQUEST_API_STATUS.done || s === "terminee" || s === "done" || s === "completed" || s === "closed") {
        return "done";
    }
    if (
        s === RH_REQUEST_API_STATUS.rejected ||
        s === "rejetee" ||
        s === "rejected" ||
        s === "refused" ||
        s === "refusee" ||
        s === "declined" ||
        s === "cancelled" ||
        s === "canceled" ||
        s === "annulee"
    ) {
        return "rejected";
    }
    return null;
}

/** Bucket UI → paramètre `status` pour GET `/rh/requests`. */
export function rhRequestBucketToApiStatus(bucket: RhRequestStatusBucket): RhRequestApiStatus {
    return RH_REQUEST_API_STATUS[bucket];
}

/** Libellé affiché pour un statut brut API. */
export function labelRhRequestStatus(raw: unknown): string {
    const s = fingerprintStatus(String(raw ?? "")) as RhRequestApiStatus;
    if (RH_REQUEST_STATUS_LABELS[s]) return RH_REQUEST_STATUS_LABELS[s];
    const bucket = rhRequestStatusToBucket(raw);
    if (bucket) return RH_REQUEST_STATUS_LABELS[RH_REQUEST_API_STATUS[bucket]];
    return String(raw ?? "").trim() || "—";
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
