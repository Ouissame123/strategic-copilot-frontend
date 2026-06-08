/**
 * WF_RH_Requests_Decision — nœud « [PATCH] Build Response » (après Postgres PATCH).
 */

const row = $input.first()?.json;

if (!row || !row.id) {
    return [
        {
            json: {
                status: "error",
                code: "request_not_found",
                message: "Demande RH introuvable",
                __http: 404,
            },
        },
    ];
}

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Requests_Decision",
            action: "updated",
            data: row,
            __http: 200,
        },
    },
];
