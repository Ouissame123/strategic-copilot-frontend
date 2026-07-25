import { Navigate, useSearchParams } from "react-router";

export type RhActionsTab = "requests" | "mobility";

type RhActionsLegacyRedirectProps = {
    defaultTab: RhActionsTab;
};

/** Préserve les query params existants (`?action=`, etc.) et ajoute `tab`. */
export function RhActionsLegacyRedirect({ defaultTab }: RhActionsLegacyRedirectProps) {
    const [searchParams] = useSearchParams();
    const next = new URLSearchParams(searchParams);
    next.set("tab", defaultTab);
    const q = next.toString();
    return <Navigate to={q ? `/workspace/rh/actions?${q}` : `/workspace/rh/actions?tab=${defaultTab}`} replace />;
}
