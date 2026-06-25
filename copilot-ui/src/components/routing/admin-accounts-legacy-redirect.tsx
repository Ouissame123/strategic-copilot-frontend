import { Navigate, useSearchParams } from "react-router";

/** `/workspace/rh/accounts` → `/admin/users` en préservant les query params. */
export function AdminAccountsLegacyRedirect() {
    const [searchParams] = useSearchParams();
    const q = searchParams.toString();
    return <Navigate to={q ? `/admin/users?${q}` : "/admin/users"} replace />;
}
