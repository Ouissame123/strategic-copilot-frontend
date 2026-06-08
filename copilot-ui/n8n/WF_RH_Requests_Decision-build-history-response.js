/**
 * WF_RH_Requests_Decision — nœud « [HISTORY] Build Response » (après Postgres GET — pas de table historique).
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

const snapshot = {
    status: row.status ?? null,
    response_message: row.response_message ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    completed_at: row.completed_at ?? null,
};

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Requests_Decision",
            action: "history",
            items: [snapshot],
            __http: 200,
        },
    },
];
