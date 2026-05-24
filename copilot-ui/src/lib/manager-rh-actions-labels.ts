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

export const RH_ACTION_STATUS_LABELS: Record<RhActionPatchStatus, string> = {
    accepted: "Acceptée",
    refused: "Refusée",
    cancelled: "Annulée",
    closed: "Clôturée",
    done: "Terminée",
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
    const s = status.toLowerCase().trim();
    const key = s as RhActionPatchStatus;
    if (RH_ACTION_STATUS_LABELS[key]) return RH_ACTION_STATUS_LABELS[key];
    if (s === "pending" || s === "open" || s === "new") return "En attente";
    return status || "—";
}
