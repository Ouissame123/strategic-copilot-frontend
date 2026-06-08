/**
 * WF_RH_Chat — nœud « [CHAT] Validate Body » (après Auth).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v) => (v == null ? "" : String(v).trim());
const ctx = $json;
const body = ctx.body || {};

const message = clean(body.message);
if (!message) {
    return [{ json: { __valid: false, __code: "MESSAGE_REQUIRED", __http: 400, message: "message obligatoire", workflow: "WF_RH_Chat" } }];
}
if (message.length > 8000) {
    return [{ json: { __valid: false, __code: "MESSAGE_TOO_LONG", __http: 400, message: "message max 8000 caractères", workflow: "WF_RH_Chat" } }];
}

const conversationId = clean(body.conversation_id);
if (conversationId && !UUID_RE.test(conversationId)) {
    return [{ json: { __valid: false, __code: "INVALID_CONVERSATION_ID", __http: 400, message: "conversation_id invalide", workflow: "WF_RH_Chat" } }];
}

const talentId = clean(body.talent_id);
if (talentId && !UUID_RE.test(talentId)) {
    return [{ json: { __valid: false, __code: "INVALID_TALENT_ID", __http: 400, message: "talent_id invalide", workflow: "WF_RH_Chat" } }];
}

const projectId = clean(body.project_id);
if (projectId && !UUID_RE.test(projectId)) {
    return [{ json: { __valid: false, __code: "INVALID_PROJECT_ID", __http: 400, message: "project_id invalide", workflow: "WF_RH_Chat" } }];
}

return [
    {
        json: {
            __valid: true,
            enterprise_id: ctx.enterprise_id,
            user_id: ctx.user_id,
            role: ctx.role,
            message,
            conversation_id: conversationId || null,
            talent_id: talentId || null,
            project_id: projectId || null,
        },
    },
];
