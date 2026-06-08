import { buildN8nUrl } from "@/lib/build-n8n-url";

/** WF Talent Matching — POST (contexte manager : enterprise_id + manager_id). */
export const MANAGER_PROJECT_TALENTS_PATH = "/webhook/api/project/talents";
export const MANAGER_PROJECT_TALENTS_URL = buildN8nUrl(MANAGER_PROJECT_TALENTS_PATH);

export const MANAGER_MATCHMAKER_TOP_N = 5;
