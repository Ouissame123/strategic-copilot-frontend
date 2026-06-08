/**
 * WF_RH_Chat — nœud « [CHAT] Resolve Conversation ID ».
 * Fusionne sortie CREATE ou ASSERT : expose conversation_id final.
 */

const validate = $("Validate Body").first().json;
const rows = $input.all().map((i) => i.json);
const found = rows.find((r) => r && r.id);

if (!found?.id) {
    return [
        {
            json: {
                __valid: false,
                __code: "CONVERSATION_NOT_FOUND",
                __http: 404,
                message: "Conversation introuvable ou non autorisée",
                workflow: "WF_RH_Chat",
            },
        },
    ];
}

return [
    {
        json: {
            ...validate,
            conversation_id: String(found.id),
            conversation_title: found.title || null,
        },
    },
];
