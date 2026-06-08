/**
 * WF_RH_Requests_Decision — nœud « [Validate] Request ID » (branches GET_ONE, PATCH, HISTORY).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v) => (v == null ? "" : String(v).trim());

const requestId = clean($json.request_id);
if (!UUID_RE.test(requestId)) {
    return [{ json: { __valid: false, __code: "INVALID_ID", __http: 400, message: "id UUID obligatoire" } }];
}

return [{ json: { ...$json, __valid: true, request_id: requestId } }];
