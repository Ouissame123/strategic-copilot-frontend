import { buildN8nUrl } from "@/lib/build-n8n-url";

/** WF Manager Analyst — POST (même body enterprise_id + manager_id). */
export const MANAGER_ANALYST_IPI_PATH = "/webhook/api/analyst/ipi";
export const MANAGER_ANALYST_NINE_BOX_PATH = "/webhook/api/analyst/nine-box";
export const MANAGER_ANALYST_MOBILITY_PATH = "/webhook/api/analyst/mobility";

export const MANAGER_ANALYST_IPI_URL = buildN8nUrl(MANAGER_ANALYST_IPI_PATH);
export const MANAGER_ANALYST_NINE_BOX_URL = buildN8nUrl(MANAGER_ANALYST_NINE_BOX_PATH);
export const MANAGER_ANALYST_MOBILITY_URL = buildN8nUrl(MANAGER_ANALYST_MOBILITY_PATH);
