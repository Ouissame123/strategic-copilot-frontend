/**
 * WF_RH_Conversations — nœud « [LIST] Build Response » (après Postgres LIST).
 */

const rows = $input.all().map((i) => i.json);
const conversations = rows.filter((r) => r && r.id);

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Conversations",
            operation: "list",
            count: conversations.length,
            conversations,
        },
    },
];
