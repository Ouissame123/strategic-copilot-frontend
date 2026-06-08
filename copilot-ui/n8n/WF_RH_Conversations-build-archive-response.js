/**
 * WF_RH_Conversations — nœud « [ARCHIVE] Build Response » (après UPDATE).
 */

const row = $input.first()?.json;

if (!row || !row.id) {
    return [{ json: { __valid: false, __code: "NOT_FOUND", __http: 404, message: "Conversation introuvable", workflow: "WF_RH_Conversations" } }];
}

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Conversations",
            operation: "archive",
            conversation: {
                id: row.id,
                status: row.status === "archived" ? "archived" : "active",
                updated_at: row.updated_at,
            },
        },
    },
];
