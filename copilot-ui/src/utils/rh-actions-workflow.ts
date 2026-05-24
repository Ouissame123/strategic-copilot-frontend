import { ApiError } from "@/api/errors";
import type { RhActionItem, RhActionsListResponse } from "@/types/manager-rh-actions.types";
import { asRecord } from "@/utils/unwrap-api-payload";

/** GET — lecture stricte de `items` (WF_Manager_RH_Actions). */
export function parseRhActionsListResponse(raw: unknown): RhActionsListResponse {
    const root = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const items = Array.isArray(root.items) ? (root.items as RhActionItem[]) : [];
    return {
        status: String(root.status ?? "success"),
        workflow: String(root.workflow ?? "WF_Manager_RH_Actions"),
        action: String(root.action ?? "list"),
        count: Number(root.count) || items.length,
        items: items.map(normalizeRhActionItem).filter((x) => x.id),
    };
}

function normalizeRhActionItem(row: unknown): RhActionItem {
    const r = asRecord(row);
    return {
        id: String(r.id ?? "").trim(),
        enterprise_id: String(r.enterprise_id ?? "").trim(),
        manager_id: String(r.manager_id ?? "").trim(),
        project_id: r.project_id != null && String(r.project_id).trim() ? String(r.project_id).trim() : null,
        type: String(r.type ?? "").trim(),
        message: String(r.message ?? "").trim(),
        priority: String(r.priority ?? "normal").trim(),
        status: String(r.status ?? "pending").trim(),
        assigned_to: r.assigned_to != null && String(r.assigned_to).trim() ? String(r.assigned_to).trim() : null,
        response_message:
            r.response_message != null && String(r.response_message).trim() ? String(r.response_message).trim() : null,
        created_at: String(r.created_at ?? "").trim(),
        updated_at: String(r.updated_at ?? "").trim(),
        completed_at: r.completed_at != null && String(r.completed_at).trim() ? String(r.completed_at).trim() : null,
    };
}

export function mapRhActionsWorkflowError(err: unknown): string {
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
            return msg || "Accès refusé : seul un compte manager peut utiliser les demandes RH.";
        }
        if (err.status === 400) return msg || "Données invalides. Vérifiez le formulaire.";
        if (err.status === 404) return msg || "Demande RH introuvable.";
        if (msg) return msg;
        return err.message;
    }
    return err instanceof Error ? err.message : "Erreur lors de l’appel au workflow RH.";
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
