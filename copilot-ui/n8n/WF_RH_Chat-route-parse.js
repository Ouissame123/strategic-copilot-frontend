/**
 * WF_RH_Chat — nœud « [Route] Parse » (Webhook POST rh/chat).
 */

const clean = (v) => (v == null ? "" : String(v).trim());

const method = clean($json.method || $json.headers?.["x-http-method"] || "POST").toUpperCase();

const body = $json.body ?? $json.json ?? {};

return [
    {
        json: {
            __op: method === "POST" ? "CHAT" : "UNKNOWN",
            method,
            body: typeof body === "object" && body !== null ? body : {},
            path: clean($json.path || $json.originalUrl || $json.url || ""),
        },
    },
];
