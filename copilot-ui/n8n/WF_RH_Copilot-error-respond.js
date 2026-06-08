/**
 * Réponse d'erreur partagée — WF_RH_Chat, WF_RH_Conversations, WF_RH_Copilot.
 * Relier à Respond to Webhook avec Response Code = {{ $json.__http }}.
 */

const item = $json;
const http = Number(item.__http) || (item.status === "error" ? 404 : 400);

const body = {
    status: "error",
    code: item.__code || item.code || "error",
    message: item.message || "Erreur",
    workflow: item.workflow || undefined,
};

return [{ json: { ...body, __http: http } }];
