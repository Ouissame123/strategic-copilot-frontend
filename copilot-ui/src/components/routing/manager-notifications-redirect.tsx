import { Navigate, useSearchParams } from "react-router";

/** Ancienne route inbox — redirige vers la page risques (GET `/webhook/manager/risks`). */
export function ManagerNotificationsRedirect() {
    const [searchParams] = useSearchParams();
    const qs = searchParams.toString();
    return <Navigate to={`/workspace/manager/risks${qs ? `?${qs}` : ""}`} replace />;
}
