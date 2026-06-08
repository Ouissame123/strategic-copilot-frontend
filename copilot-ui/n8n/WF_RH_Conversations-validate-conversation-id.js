/**
 * WF_RH_Conversations — nœud « [GET_DETAIL] Validate ID » (après Auth).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v) => (v == null ? "" : String(v).trim());
const conversationId = clean($json.conversation_id);

if (!UUID_RE.test(conversationId)) {
    return [{ json: { __valid: false, __code: "INVALID_ID", __http: 400, message: "id UUID obligatoire", workflow: "WF_RH_Conversations" } }];
}

return [
    {
        json: {
            __valid: true,
            enterprise_id: $json.enterprise_id,
            user_id: $json.user_id,
            conversation_id: conversationId,
        },
    },
];
