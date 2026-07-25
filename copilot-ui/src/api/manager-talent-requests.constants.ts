/** WF_Manager_Talent_Requests — liste manager des demandes créées côté talent. */
export const MANAGER_TALENT_REQUESTS_LIST_PATH = "/webhook/manager/talent-requests";

export function managerTalentRequestDetailPath(requestId: string): string {
    const id = requestId.trim();
    const fromEnv = (import.meta.env.VITE_MANAGER_TALENT_REQUEST_DETAIL_PATH as string | undefined)?.trim();
    if (fromEnv) {
        return fromEnv.replace("{id}", encodeURIComponent(id)).replace(":id", encodeURIComponent(id));
    }
    return `/webhook/wf-manager-talent-requests-detail/manager/talent-requests/${encodeURIComponent(id)}`;
}

/** PATCH statut — `PATCH /webhook/manager/talent-requests/:id` body `{ status }`. */
export function managerTalentRequestStatusPath(requestId: string): string {
    const id = requestId.trim();
    const fromEnv = (import.meta.env.VITE_MANAGER_TALENT_REQUEST_STATUS_PATH as string | undefined)?.trim();
    if (fromEnv) {
        return fromEnv.replace("{id}", encodeURIComponent(id)).replace(":id", encodeURIComponent(id));
    }
    return `${MANAGER_TALENT_REQUESTS_LIST_PATH}/${encodeURIComponent(id)}`;
}

export function managerTalentRequestDecisionPath(requestId: string): string {
    const id = requestId.trim();
    const fromEnv = (import.meta.env.VITE_MANAGER_TALENT_REQUEST_DECISION_PATH as string | undefined)?.trim();
    if (fromEnv) {
        return fromEnv.replace("{id}", encodeURIComponent(id)).replace(":id", encodeURIComponent(id));
    }
    return `/webhook/wf-manager-talent-requests-decision/manager/talent-requests/${encodeURIComponent(id)}`;
}
