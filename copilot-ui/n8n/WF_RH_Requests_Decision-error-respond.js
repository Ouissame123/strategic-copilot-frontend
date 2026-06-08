/**
 * WF_RH_Requests_Decision — nœud « [Respond] Error » (entrée : __valid === false ou __http >= 400).
 * Relier à un nœud Respond to Webhook avec Response Code = {{ $json.__http }}.
 */

const item = $json;
const http = Number(item.__http) || (item.status === "error" ? 404 : 400);

const body = {
    status: "error",
    code: item.__code || item.code || "error",
    message: item.message || "Erreur",
};

return [{ json: { ...body, __http: http } }];
