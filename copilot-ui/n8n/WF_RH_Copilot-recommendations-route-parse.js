/**
 * WF_RH_Copilot — nœud « [Route] Parse » (Webhook POST rh/recommendations/generate).
 */

const clean = (v) => (v == null ? "" : String(v).trim());

const method = clean($json.method || $json.headers?.["x-http-method"] || "POST").toUpperCase();

const body = $json.body ?? $json.json ?? {};

return [
    {
        json: {
            __op: method === "POST" ? "GENERATE" : "UNKNOWN",
            method,
            body: typeof body === "object" && body !== null ? body : {},
            path: clean($json.path || $json.originalUrl || ""),
        },
    },
];
