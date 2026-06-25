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

export function managerTalentRequestDecisionPath(requestId: string): string {
    const id = requestId.trim();
    const fromEnv = (import.meta.env.VITE_MANAGER_TALENT_REQUEST_DECISION_PATH as string | undefined)?.trim();
    if (fromEnv) {
        return fromEnv.replace("{id}", encodeURIComponent(id)).replace(":id", encodeURIComponent(id));
    }
    return `/webhook/wf-manager-talent-requests-decision/manager/talent-requests/${encodeURIComponent(id)}`;
}
