/**
 * WF_RH_Risks_Watchdog_v1 — endpoints production n8n.
 * @see https://n8nprod.aphelionxinnovations.com/webhook/rh/risks
 */
export const RH_RISKS_N8N_ORIGIN = "https://n8nprod.aphelionxinnovations.com";

const PROD_WEBHOOK = `${RH_RISKS_N8N_ORIGIN}/webhook`;
const DEV_WEBHOOK = "/webhook";

/** GET — liste risques (`?risk_type`, `?severity`, `?search`, …) */
export const RH_RISKS_LIST_URL_PRODUCTION = `${PROD_WEBHOOK}/rh/risks`;
export const RH_RISKS_LIST_URL_DEV = `${DEV_WEBHOOK}/rh/risks`;

/** GET — KPI agrégés */
export const RH_RISKS_SUMMARY_URL_PRODUCTION = `${PROD_WEBHOOK}/rh/risks/summary`;
export const RH_RISKS_SUMMARY_URL_DEV = `${DEV_WEBHOOK}/rh/risks/summary`;

/** GET — détail talent + risques (`wf-rh-risks-talent-v1`) */
export const RH_RISKS_TALENT_URL_PRODUCTION = `${PROD_WEBHOOK}/wf-rh-risks-talent-v1/rh/risks/talent`;
export const RH_RISKS_TALENT_URL_DEV = `${DEV_WEBHOOK}/wf-rh-risks-talent-v1/rh/risks/talent`;

/** POST — convertir un risque en rh_action */
export const RH_RISKS_CREATE_ACTION_URL_PRODUCTION = `${PROD_WEBHOOK}/rh/risks/create-action`;
export const RH_RISKS_CREATE_ACTION_URL_DEV = `${DEV_WEBHOOK}/rh/risks/create-action`;
