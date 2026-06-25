import { Navigate, useParams } from "react-router";

/** Legacy bookmark : `/workspace/rh/talent/:talentId` → fiche employé. */
export function RhTalentLegacyRedirect() {
    const { talentId } = useParams<{ talentId: string }>();
    const id = talentId?.trim();
    if (!id) return <Navigate to="/workspace/rh/employees" replace />;
    return <Navigate to={`/workspace/rh/employees?talentId=${encodeURIComponent(id)}`} replace />;
}

/** Legacy bookmark : `/workspace/rh/actions/:actionId` → file demandes managers. */
export function RhActionLegacyRedirect() {
    const { actionId } = useParams<{ actionId: string }>();
    const id = actionId?.trim();
    if (!id) return <Navigate to="/workspace/rh/actions?tab=requests" replace />;
    return <Navigate to={`/workspace/rh/actions?tab=requests&action=${encodeURIComponent(id)}`} replace />;
}
