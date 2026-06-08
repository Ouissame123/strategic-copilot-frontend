/**
 * WF_RH_Requests_Decision — routes RH (consultation + décision).
 * Ne pas confondre avec WF_Manager_RH_Actions (`/webhook/api/rh/actions`).
 */
export const RH_REQUESTS_N8N_ORIGIN = "https://n8nprod.aphelionxinnovations.com";

/** GET list · GET :id · PATCH :id · GET :id/actions */
export const RH_REQUESTS_BASE_PATH = "/webhook/rh/requests";

export const RH_REQUESTS_URL_PRODUCTION = `${RH_REQUESTS_N8N_ORIGIN}${RH_REQUESTS_BASE_PATH}`;

/** PATCH décision — `https://n8nprod…/webhook/rh/requests/{id}` */
export function rhRequestDecisionPath(id: string): string {
    const raw = String(id ?? "").trim();
    return `${RH_REQUESTS_BASE_PATH}/${encodeURIComponent(raw)}`;
}

/** GET historique — `https://n8nprod…/webhook/rh/requests/{id}/actions` */
export function rhRequestHistoryPath(id: string): string {
    return `${rhRequestDecisionPath(id)}/actions`;
}

/** PATCH décision — webhook `wf-rh-requests-decision-v1` (pas `/webhook/rh/requests`). */
export function rhRequestDecisionUrl(id: string): string {
    const raw = String(id ?? "").trim();
    return `${RH_REQUESTS_N8N_ORIGIN}/webhook/wf-rh-requests-decision-v1/rh/requests/${encodeURIComponent(raw)}`;
}

export function rhRequestHistoryUrl(id: string): string {
    return `${RH_REQUESTS_N8N_ORIGIN}${rhRequestHistoryPath(id)}`;
}

/** Statuts PATCH workflow n8n (anglais — corps requête uniquement). */
export const RH_REQUEST_PATCH_STATUS = {
    accepted: "accepted",
    rejected: "rejected",
    in_progress: "in_progress",
    done: "done",
} as const;

export type RhRequestPatchStatus = (typeof RH_REQUEST_PATCH_STATUS)[keyof typeof RH_REQUEST_PATCH_STATUS];

export const RH_REQUEST_PATCH_REASON_DEFAULTS = {
    accepted: "Demande acceptée par le RH",
    rejected: "Demande rejetée par le RH",
    in_progress: "Traitement en cours",
    done: "Traitement terminé",
} as const;

/** Statuts renvoyés / acceptés par le workflow n8n (français). */
export const RH_REQUEST_API_STATUS = {
    pending: "en_attente",
    accepted: "acceptee",
    in_progress: "en_cours",
    done: "terminee",
    rejected: "rejetee",
} as const;

export type RhRequestApiStatus = (typeof RH_REQUEST_API_STATUS)[keyof typeof RH_REQUEST_API_STATUS];

/** Statuts autorisés en PATCH côté RH. */
export const RH_REQUEST_DECISION_STATUSES: readonly RhRequestApiStatus[] = [
    RH_REQUEST_API_STATUS.accepted,
    RH_REQUEST_API_STATUS.in_progress,
    RH_REQUEST_API_STATUS.done,
    RH_REQUEST_API_STATUS.rejected,
];

export type RhRequestDecisionStatus = RhRequestApiStatus;

/** Libellés UI (lecture seule). */
export const RH_REQUEST_STATUS_LABELS: Record<RhRequestApiStatus, string> = {
    en_attente: "En attente",
    acceptee: "Acceptée",
    en_cours: "En cours",
    terminee: "Terminée",
    rejetee: "Rejetée",
};
