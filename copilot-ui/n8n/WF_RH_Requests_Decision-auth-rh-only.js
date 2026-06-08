/**
 * WF_RH_Requests_Decision — nœud « [Auth] RH Only » (après « JWT Decode »).
 * Rôle autorisé : rh uniquement. Le manager est interdit (403).
 */

const payload = $json?.payload || $json?.decoded?.payload || $json;

if (!payload || !payload.sub) {
    return [{ json: { __valid: false, __code: "MISSING_AUTH", __http: 401, message: "Authorization manquant ou token invalide" } }];
}

const now = Math.floor(Date.now() / 1000);
if (!payload.exp || payload.exp < now) {
    return [{ json: { __valid: false, __code: "TOKEN_EXPIRED", __http: 401, message: "Token expiré" } }];
}

if (payload.type === "refresh" || payload.token_kind === "refresh") {
    return [{ json: { __valid: false, __code: "WRONG_TOKEN_TYPE", __http: 401, message: "Refresh token interdit ici" } }];
}

if (!payload.enterprise_id) {
    return [{ json: { __valid: false, __code: "NO_ENTERPRISE", __http: 422, message: "Token sans enterprise_id" } }];
}

const role = String(payload.role || "").trim().toLowerCase();
if (role !== "rh") {
    return [
        {
            json: {
                __valid: false,
                __code: "FORBIDDEN",
                __http: 403,
                message: role === "manager" ? "Accès réservé au rôle RH" : "Rôle RH requis",
            },
        },
    ];
}

const route = $("Route Parse").first().json;

return [
    {
        json: {
            __valid: true,
            __op: route.__op,
            enterprise_id: String(payload.enterprise_id).trim(),
            rh_user_id: String(payload.sub).trim(),
            request_id: route.request_id || null,
            method: route.method,
            query: route.query || {},
            body: route.body || {},
        },
    },
];
