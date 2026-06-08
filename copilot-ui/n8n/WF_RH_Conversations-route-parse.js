/**
 * WF_RH_Conversations — nœud « [Route] Parse » (après chaque Webhook).
 * __op : LIST | GET_DETAIL | ARCHIVE
 *
 * Webhooks (path relatif n8n, sans /webhook) :
 *   GET   rh/conversations
 *   GET   rh/conversations/:id
 *   PATCH rh/conversations/:id/archive
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v) => (v == null ? "" : String(v).trim());

const method = clean($json.method || $json.headers?.["x-http-method"] || "GET").toUpperCase();

const params = $json.params || {};
const query = $json.query || {};

const conversationId =
    clean(params.id) ||
    clean(params.conversationId) ||
    clean(params.conversation_id) ||
    clean(query.id) ||
    "";

const pathRaw =
    clean($json.path) ||
    clean($json.originalUrl) ||
    clean($json.url) ||
    clean($json.route) ||
    "";

const pathParts = pathRaw.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
const convIdx = pathParts.indexOf("conversations");
const tail = convIdx >= 0 ? pathParts.slice(convIdx + 1) : [];

let __op = "UNKNOWN";
let parsedId = conversationId;

if (tail.length === 0 && method === "GET") {
    __op = "LIST";
} else if (tail.length === 1 && UUID_RE.test(tail[0])) {
    parsedId = tail[0];
    if (method === "GET") __op = "GET_DETAIL";
} else if (tail.length === 2 && tail[1] === "archive" && UUID_RE.test(tail[0])) {
    parsedId = tail[0];
    if (method === "PATCH") __op = "ARCHIVE";
}

const body = $json.body ?? $json.json ?? {};

return [
    {
        json: {
            __op,
            method,
            conversation_id: parsedId || null,
            query: {
                status: clean(query.status) || null,
                search: clean(query.search) || null,
                limit: query.limit != null ? Number(query.limit) : null,
            },
            body: typeof body === "object" && body !== null ? body : {},
            path: pathRaw,
        },
    },
];
