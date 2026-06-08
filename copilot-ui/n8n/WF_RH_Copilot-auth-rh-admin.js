/**
 * Auth partagé — WF_RH_Chat, WF_RH_Conversations, WF_RH_Copilot (recommendations).
 * Rôles autorisés : rh, admin. enterprise_id obligatoire dans le JWT.
 * Lit le contexte route via $('Route Parse').first().json — renommer le nœud exactement « Route Parse ».
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
if (role !== "rh" && role !== "admin") {
    return [
        {
            json: {
                __valid: false,
                __code: "FORBIDDEN",
                __http: 403,
                message: "Accès réservé aux rôles RH ou administrateur",
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
            user_id: String(payload.sub).trim(),
            role,
            conversation_id: route.conversation_id || null,
            method: route.method,
            query: route.query || {},
            body: route.body || {},
        },
    },
];
