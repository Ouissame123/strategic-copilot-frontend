/**
 * WF_RH_Project_Budget_v1 — endpoints production n8n.
 * @see https://n8nprod.aphelionxinnovations.com/webhook/rh/projects/budget
 */
export const RH_BUDGET_N8N_ORIGIN = "https://n8nprod.aphelionxinnovations.com";

const PROD_BASE = `${RH_BUDGET_N8N_ORIGIN}/webhook/rh/projects/budget`;
const DEV_BASE = "/webhook/rh/projects/budget";

/** GET — liste projets + filtres */
export const RH_BUDGET_LIST_URL_PRODUCTION = PROD_BASE;
export const RH_BUDGET_LIST_URL_DEV = DEV_BASE;

/** GET — détail projet */
export const RH_BUDGET_DETAIL_URL_PRODUCTION = `${PROD_BASE}/detail`;
export const RH_BUDGET_DETAIL_URL_DEV = `${DEV_BASE}/detail`;

/** PATCH — ajustement enveloppe */
export const RH_BUDGET_ENVELOPE_URL_PRODUCTION = `${PROD_BASE}/envelope`;
export const RH_BUDGET_ENVELOPE_URL_DEV = `${DEV_BASE}/envelope`;

/** GET — historique ajustements */
export const RH_BUDGET_HISTORY_URL_PRODUCTION = `${PROD_BASE}/history`;
export const RH_BUDGET_HISTORY_URL_DEV = `${DEV_BASE}/history`;

/** GET — synthèse entreprise */
export const RH_BUDGET_SUMMARY_URL_PRODUCTION = `${PROD_BASE}/summary`;
export const RH_BUDGET_SUMMARY_URL_DEV = `${DEV_BASE}/summary`;
