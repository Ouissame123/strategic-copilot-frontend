import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/providers/auth-provider";
import type { Permission, Role } from "@/types/auth";
import { getDefaultWorkspacePath } from "@/utils/workspace-routes";

interface ProtectedRouteProps {
    children: ReactNode;
    roles?: Role[];
    permissions?: Permission[];
}

export function ProtectedRoute({ children, roles = [], permissions = [] }: ProtectedRouteProps) {
    const { isAuthenticated, isPendingApproval, isDisabled, hasRole, hasPermission, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isPendingApproval) {
        return <Navigate to="/pending-approval" replace />;
    }

    if (isDisabled) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0 && !hasRole(...roles)) {
        return <Navigate to={getDefaultWorkspacePath(user?.role)} replace />;
    }

    if (permissions.length > 0 && !hasPermission(...permissions)) {
        return <Navigate to={getDefaultWorkspacePath(user?.role)} replace />;
    }

    return <>{children}</>;
}
