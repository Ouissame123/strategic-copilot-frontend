import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";

const POLL_MS = 30_000;

/**
 * Rafraîchissement périodique des caches TanStack Query partagés entre rôles (pas de WebSocket requis).
 * Les vues qui utilisent ces clés se mettent à jour automatiquement.
 */
export function CrossRoleQuerySync() {
    const { user, isAuthenticated } = useAuth();
    const qc = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !user?.role) return;

        const id = window.setInterval(() => {
            void qc.invalidateQueries({ queryKey: queryKeys.portfolio.all });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.all, refetchType: "active" });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.all, refetchType: "active" });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all, refetchType: "active" });
        }, POLL_MS);

        return () => window.clearInterval(id);
    }, [qc, user?.role, isAuthenticated]);

    return null;
}
