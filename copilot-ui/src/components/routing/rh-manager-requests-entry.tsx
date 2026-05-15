import { Navigate, useLocation } from "react-router";
import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { useRhWorkspaceNavItems } from "@/layouts/nav/use-rh-workspace-nav";
import ManagerRequestsPage from "@/pages/rh/ManagerRequestsPage";
import { useAuth } from "@/providers/auth-provider";

/**
 * `/workspace/rh/manager-requests` : les managers sont redirigés vers « Demandes RH » manager ;
 * les utilisateurs RH voient la file de traitement (composant partagé, hors duplication de logique métier).
 */
function RhManagerRequestsShellPage() {
    const items = useRhWorkspaceNavItems();
    return (
        <WorkspaceShellLayout workspaceRole="rh" navItems={items}>
            <ManagerRequestsPage />
        </WorkspaceShellLayout>
    );
}

export function RhManagerRequestsEntry() {
    const { user } = useAuth();
    const { search } = useLocation();
    if (user?.role === "manager") {
        return <Navigate to={search ? `/workspace/manager/hr-requests${search}` : "/workspace/manager/hr-requests"} replace />;
    }
    return <RhManagerRequestsShellPage />;
}
