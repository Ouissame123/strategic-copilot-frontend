/**
 * WF_RH_Requests_Decision — nœud « [LIST] Build Response » (après Postgres LIST).
 */

const rows = $input.all().map((i) => i.json);
const items = rows.filter((r) => r && r.id);

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Requests_Decision",
            action: "list",
            count: items.length,
            items,
        },
    },
];
