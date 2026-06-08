/**
 * WF_RH_Requests_Decision — nœud « [Route] Parse » (juste après chaque Webhook).
 * Définir __op sur l’item webhook : LIST | GET_ONE | PATCH | HISTORY
 *
 * Webhooks n8n (path relatif, sans /webhook) :
 *   GET    rh/requests
 *   GET    rh/requests/:id
 *   PATCH  rh/requests/:id
 *   GET    rh/requests/:id/actions
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v) => (v == null ? "" : String(v).trim());

const method = clean($json.method || $json.headers?.["x-http-method"] || "GET").toUpperCase();

const params = $json.params || {};
const query = $json.query || {};

const requestId =
    clean(params.id) ||
    clean(params.requestId) ||
    clean(params.request_id) ||
    clean(query.id) ||
    "";

const pathRaw =
    clean($json.path) ||
    clean($json.originalUrl) ||
    clean($json.url) ||
    clean($json.route) ||
    "";

const pathParts = pathRaw.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
const reqIdx = pathParts.indexOf("requests");
const tail = reqIdx >= 0 ? pathParts.slice(reqIdx + 1) : [];

let __op = "UNKNOWN";
let parsedId = requestId;

if (tail.length === 0 && method === "GET") {
    __op = "LIST";
} else if (tail.length === 1 && UUID_RE.test(tail[0])) {
    parsedId = tail[0];
    if (method === "GET") __op = "GET_ONE";
    if (method === "PATCH") __op = "PATCH";
} else if (tail.length === 2 && tail[1] === "actions" && UUID_RE.test(tail[0])) {
    parsedId = tail[0];
    if (method === "GET") __op = "HISTORY";
}

const body = $json.body ?? $json.json ?? {};

return [
    {
        json: {
            __op,
            method,
            request_id: parsedId || null,
            query: {
                status: clean(query.status) || null,
                type: clean(query.type) || null,
                priority: clean(query.priority) || null,
                project_id: clean(query.project_id) || null,
            },
            body: typeof body === "object" && body !== null ? body : {},
            path: pathRaw,
        },
    },
];
