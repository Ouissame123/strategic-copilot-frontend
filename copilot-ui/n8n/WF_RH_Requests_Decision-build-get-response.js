/**
 * WF_RH_Requests_Decision — nœud « [GET_ONE] Build Response » (après Postgres GET).
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
            action: "get",
            data: row,
            __http: 200,
        },
    },
];
