/**
 * WF_RH_Requests_Decision — nœud « [PATCH] Validate Body » (après Auth, branche PATCH).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(["accepted", "rejected", "in_progress", "done", "closed"]);
const FORBIDDEN = new Set(["cancelled", "canceled", "pending", "open", "new", "draft", "submitted"]);

const ctx = $json;
const clean = (v) => (v == null ? "" : String(v).trim());

const requestId = clean(ctx.request_id);
if (!UUID_RE.test(requestId)) {
    return [{ json: { __valid: false, __code: "INVALID_ID", __http: 400, message: "id UUID obligatoire" } }];
}

const body = ctx.body || {};
const status = clean(body.status).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

if (!status) {
    return [{ json: { __valid: false, __code: "STATUS_REQUIRED", __http: 400, message: "status obligatoire" } }];
}

if (FORBIDDEN.has(status)) {
    return [
        {
            json: {
                __valid: false,
                __code: "STATUS_FORBIDDEN",
                __http: 400,
                message:
                    status === "cancelled" || status === "canceled"
                        ? "cancelled est réservé au manager"
                        : "pending ne peut pas être défini par le RH",
            },
        },
    ];
}

if (!ALLOWED.has(status)) {
    return [
        {
            json: {
                __valid: false,
                __code: "STATUS_INVALID",
                __http: 400,
                message: "status doit être accepted, rejected, in_progress, done ou closed",
            },
        },
    ];
}

const responseMessage = clean(body.response_message);
if (responseMessage.length > 5000) {
    return [{ json: { __valid: false, __code: "MESSAGE_TOO_LONG", __http: 400, message: "response_message max 5000 caractères" } }];
}

const assignedRaw = clean(body.assigned_to);
if (assignedRaw && !UUID_RE.test(assignedRaw)) {
    return [{ json: { __valid: false, __code: "INVALID_ASSIGNED_TO", __http: 400, message: "assigned_to doit être un UUID" } }];
}

return [
    {
        json: {
            __valid: true,
            request_id: requestId,
            enterprise_id: ctx.enterprise_id,
            status,
            response_message: responseMessage || null,
            assigned_to: assignedRaw || null,
        },
    },
];
