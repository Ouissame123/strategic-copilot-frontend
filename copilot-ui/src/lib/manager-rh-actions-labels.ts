import type { RhActionPatchStatus, RhActionPriority, RhActionRequestType } from "@/types/manager-rh-actions.types";

export const RH_ACTION_TYPE_LABELS: Record<RhActionRequestType, string> = {
    skill_gap: "Écart de compétences",
    reallocation: "Réaffectation",
    training: "Formation",
    overload: "Surcharge",
    recruitment: "Recrutement",
};

export const RH_ACTION_PRIORITY_LABELS: Record<RhActionPriority, string> = {
    urgent: "Urgent",
    normal: "Normal",
    low: "Faible",
};

/** Libellés lecture seule — statuts renvoyés par l’API (manager ne valide pas). */
export const RH_ACTION_STATUS_DISPLAY_LABELS: Record<string, string> = {
    pending: "En attente",
    accepted: "Acceptée",
    rejected: "Rejetée",
    refused: "Refusée",
    cancelled: "Annulée",
    in_progress: "En cours",
    done: "Terminée",
    closed: "Clôturée",
};

export const RH_ACTION_STATUS_LABELS: Record<RhActionPatchStatus, string> = {
    accepted: RH_ACTION_STATUS_DISPLAY_LABELS.accepted,
    refused: RH_ACTION_STATUS_DISPLAY_LABELS.refused,
    cancelled: RH_ACTION_STATUS_DISPLAY_LABELS.cancelled,
    closed: RH_ACTION_STATUS_DISPLAY_LABELS.closed,
    done: RH_ACTION_STATUS_DISPLAY_LABELS.done,
};

export function labelRhActionType(type: string): string {
    const key = type as RhActionRequestType;
    return RH_ACTION_TYPE_LABELS[key] ?? type;
}

export function labelRhActionPriority(priority: string): string {
    const key = priority as RhActionPriority;
    return RH_ACTION_PRIORITY_LABELS[key] ?? priority;
}

export function labelRhActionStatus(status: string): string {
    const s = status.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
    if (RH_ACTION_STATUS_DISPLAY_LABELS[s]) return RH_ACTION_STATUS_DISPLAY_LABELS[s];
    if (s === "open" || s === "new" || s === "submitted" || s === "draft") return RH_ACTION_STATUS_DISPLAY_LABELS.pending;
    if (s.includes("reject") || s.includes("refus") || s.includes("declin")) return RH_ACTION_STATUS_DISPLAY_LABELS.rejected;
    if (s.includes("progress") || s.includes("cours") || s.includes("trait")) return RH_ACTION_STATUS_DISPLAY_LABELS.in_progress;
    if (s.includes("annul") || s === "canceled") return RH_ACTION_STATUS_DISPLAY_LABELS.cancelled;
    if (s.includes("accept") || s.includes("approved")) return RH_ACTION_STATUS_DISPLAY_LABELS.accepted;
    if (s.includes("termin") || s === "completed" || s === "resolved") return RH_ACTION_STATUS_DISPLAY_LABELS.done;
    return status || "—";
}

export function isRhActionPendingStatus(status: string): boolean {
    const s = status.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
    return s === "pending" || s === "open" || s === "new" || s === "submitted" || s === "draft" || s === "en_attente" || !s;
}
