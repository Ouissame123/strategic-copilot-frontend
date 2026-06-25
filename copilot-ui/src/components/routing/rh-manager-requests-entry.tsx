import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/providers/auth-provider";

/**
 * `/workspace/rh/manager-requests` — legacy bookmark / notifications.
 * Managers → espace manager ; RH → `/workspace/rh/actions?tab=requests`.
 */
export function RhManagerRequestsEntry() {
    const { user } = useAuth();
    const { search } = useLocation();

    if (user?.role === "manager") {
        const target = search ? `/workspace/manager/rh-requests${search}` : "/workspace/manager/rh-requests";
        return <Navigate to={target} replace />;
    }

    const params = new URLSearchParams(search);
    if (!params.has("tab")) params.set("tab", "requests");
    return <Navigate to={`/workspace/rh/actions?${params.toString()}`} replace />;
}
