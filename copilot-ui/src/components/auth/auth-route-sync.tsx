import { useEffect } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/providers/auth-provider";

/**
 * Keeps auth state in sync with backend session when route changes.
 */
export function AuthRouteSync() {
    const { pathname } = useLocation();
    const { syncSession } = useAuth();

    useEffect(() => {
        void syncSession();
    }, [pathname, syncSession]);

    return null;
}
