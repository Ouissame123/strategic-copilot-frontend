/**
 * WF_RH_Matching_Run — endpoints production n8n (ne pas utiliser /webhook-test/).
 */
export const RH_MATCHING_N8N_ORIGIN = "https://n8nprod.aphelionxinnovations.com";

/** POST — lancer le matching IA */
export const RH_MATCHING_RUN_URL_PRODUCTION = `${RH_MATCHING_N8N_ORIGIN}/webhook/rh/matching`;

/** GET — récupérer les résultats (`?project_id=` ou `{project_id}` dans le template) */
export const RH_MATCHING_RESULTS_URL_PRODUCTION = `${RH_MATCHING_N8N_ORIGIN}/webhook/rh/matching/results`;

/** GET — liste des projets pour le select « Projet cible » */
export const RH_MATCHING_PROJECTS_URL_PRODUCTION = `${RH_MATCHING_N8N_ORIGIN}/webhook/rh/matching/projects`;

/** Chemins relatifs pour le proxy Vite en dev (`/webhook` → n8nprod). */
export const RH_MATCHING_RUN_URL_DEV = "/webhook/rh/matching";
export const RH_MATCHING_RESULTS_URL_DEV = "/webhook/rh/matching/results";
export const RH_MATCHING_PROJECTS_URL_DEV = "/webhook/rh/matching/projects";
