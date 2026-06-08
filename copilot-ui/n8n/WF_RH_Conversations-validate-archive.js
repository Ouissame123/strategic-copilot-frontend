/**
 * WF_RH_Conversations — nœud « [ARCHIVE] Validate » (après Auth, branche ARCHIVE).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v) => (v == null ? "" : String(v).trim());
const ctx = $json;

const conversationId = clean(ctx.conversation_id);
if (!UUID_RE.test(conversationId)) {
    return [{ json: { __valid: false, __code: "INVALID_ID", __http: 400, message: "id UUID obligatoire", workflow: "WF_RH_Conversations" } }];
}

const body = ctx.body || {};
const restore = body.restore === true || body.restore === "true" || body.restore === 1;

return [
    {
        json: {
            __valid: true,
            enterprise_id: ctx.enterprise_id,
            user_id: ctx.user_id,
            conversation_id: conversationId,
            restore,
            new_status: restore ? "active" : "archived",
        },
    },
];
