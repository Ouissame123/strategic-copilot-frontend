/** WF_Talent_Requests_CRUD_v1 — CRUD demandes talent. */
export const TALENT_REQUESTS_BASE_PATH = "/webhook/talent/requests";

export function talentRequestDetailPath(requestId: string): string {
    return `${TALENT_REQUESTS_BASE_PATH}/${encodeURIComponent(requestId)}`;
}
