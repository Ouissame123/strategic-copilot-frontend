/**
 * Coller ce code dans le nœud n8n « [Route] Validate Claims » (après « JWT Decode »).
 *
 * Problème corrigé : `$('Merge All Inputs').first().json` peut être la mauvaise entrée
 * quand seul le webhook GET /manager/team/:talentId s’exécute (branche DETAIL) :
 * le `talent_id` n’atteint pas le nœud Postgres → détail vide → 404.
 *
 * On choisit explicitement l’item Merge qui porte __op === 'GET_DETAIL' avec un talent_id,
 * sinon la branche LIST.
 */

const mergeItems = $('Merge All Inputs')
    .all()
    .map((i) => i.json)
    .filter((j) => j && typeof j === "object");

const ctx =
    mergeItems.find((r) => r.__op === "GET_DETAIL" && String(r.talent_id || "").trim()) ||
    mergeItems.find((r) => r.__op === "LIST") ||
    mergeItems[0];

if (!ctx || !ctx.__op) {
    return [
        {
            json: {
                __valid: false,
                __code: "MERGE_ROUTE_CTX",
                __http: 500,
                message:
                    "Contexte route introuvable (Merge). Dans le nœud Merge : désactive l’attente des deux entrées, ou relie LIST/DETAIL sans bloquer la branche inactive.",
            },
        },
    ];
}

const payload = $json?.payload || $json?.decoded?.payload || $json;
if (!payload || !payload.sub) {
    return [{ json: { __valid: false, __code: "INVALID_TOKEN", __http: 401, message: "Token invalide" } }];
}

const now = Math.floor(Date.now() / 1000);
if (!payload.exp || payload.exp < now) {
    return [{ json: { __valid: false, __code: "TOKEN_EXPIRED", __http: 401, message: "Token expire" } }];
}
if (payload.type === "refresh" || payload.token_kind === "refresh") {
    return [{ json: { __valid: false, __code: "WRONG_TOKEN_TYPE", __http: 401, message: "Refresh token interdit ici" } }];
}
if (!["manager", "rh"].includes(payload.role)) {
    return [{ json: { __valid: false, __code: "FORBIDDEN", __http: 403, message: "Role manager ou rh requis" } }];
}
if (!payload.enterprise_id) {
    return [{ json: { __valid: false, __code: "NO_ENTERPRISE", __http: 422, message: "Token sans enterprise_id" } }];
}

const scope = ctx.filters?.scope || "mine";
const effective_scope = scope === "enterprise" && payload.role === "rh" ? "enterprise" : "mine";

return [
    {
        json: {
            __valid: true,
            __op: ctx.__op,
            user_id: payload.sub,
            enterprise_id: payload.enterprise_id,
            role: payload.role,
            talent_id: ctx.talent_id,
            filters: { ...(ctx.filters || {}), effective_scope },
        },
    },
];
