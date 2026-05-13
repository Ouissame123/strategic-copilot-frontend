import { Navigate, Outlet } from "react-router";
import { useMe } from "@/hooks/useMe";

type Role = "rh" | "manager" | "talent";

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
    const { data, isLoading, error } = useMe();

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;
    }

    if (error || !data?.user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(data.user.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    if (data.user.must_change_password) {
        return <Navigate to="/profile?force_password" replace />;
    }

    return <Outlet />;
}
