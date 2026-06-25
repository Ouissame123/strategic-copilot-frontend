import { Navigate, useLocation } from "react-router";

/** `/workspace/rh/accounts/health` → `/admin/accounts/health` (préserve query params). */
export function AdminAccountsHealthLegacyRedirect() {
    const location = useLocation();
    return <Navigate to={`/admin/accounts/health${location.search}`} replace />;
}
