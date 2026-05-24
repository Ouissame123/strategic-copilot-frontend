/**
 * WF_Manager_RH_Actions — URLs n8n production.
 * GET/POST : /webhook/api/rh/actions
 * PATCH    : /webhook/c8bae94d-8de1-4f06-bb0a-a1e90eb6a80d/api/rh/actions/:id
 */
export const RH_ACTIONS_N8N_ORIGIN = "https://n8nprod.aphelionxinnovations.com";

export const RH_ACTIONS_PATCH_WEBHOOK_ID = "c8bae94d-8de1-4f06-bb0a-a1e90eb6a80d";

/** GET + POST */
export const RH_ACTIONS_LIST_POST_PATH = "/webhook/api/rh/actions";

export const RH_ACTIONS_LIST_POST_URL_PRODUCTION = `${RH_ACTIONS_N8N_ORIGIN}${RH_ACTIONS_LIST_POST_PATH}`;

/** PATCH (webhookId dédié n8n) */
export const RH_ACTIONS_PATCH_PATH = `/webhook/${RH_ACTIONS_PATCH_WEBHOOK_ID}/api/rh/actions`;

export const RH_ACTIONS_PATCH_URL_PRODUCTION = `${RH_ACTIONS_N8N_ORIGIN}${RH_ACTIONS_PATCH_PATH}`;
