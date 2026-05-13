import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { useDashboard } from "@/hooks/useDashboard";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { formatRelativeShort } from "@/lib/format-relative-short";

/**
 * Détail d’une action RH listée sur le dashboard (même source de données, pas de nouvel endpoint).
 * Les managers ne passent pas par l’espace `/workspace/rh` (rôle réservé RH).
 */
export default function ManagerPendingActionPage() {
    const { t } = useTranslation("common");
    const { actionId } = useParams();
    const { user } = useAuth();
    const { data, isLoading, isError } = useDashboard("mine");
    const item = data?.widgets.pending_rh_actions.find((a) => a.id === actionId);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.pendingRh.title")}
            description={t("managerWorkspace.pendingRh.description")}
        >
            {isLoading ? <p className="text-sm text-tertiary">{t("loading")}</p> : null}
            {isError ? <p className="text-sm text-red-600">{t("managerWorkspace.pendingRh.loadError")}</p> : null}
            {!isLoading && !isError && item ? (
                <div className="max-w-lg space-y-4 rounded-xl border border-secondary bg-primary p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-tertiary">{item.type}</p>
                    <p className="text-base font-medium text-primary">{item.message ?? t("managerWorkspace.relative.emDash")}</p>
                    <p className="text-sm text-tertiary">
                        {item.project_name ?? t("managerWorkspace.pendingRh.projectUnknown")} · {formatRelativeShort(item.created_at)}
                    </p>
                    {user?.role === "rh" ? (
                        <Link
                            to={`/workspace/rh/manager-requests?action=${encodeURIComponent(item.id)}`}
                            className="inline-flex text-sm font-medium text-brand-secondary hover:underline"
                        >
                            {t("managerWorkspace.pendingRh.openInRh")}
                        </Link>
                    ) : (
                        <p className="text-sm text-tertiary">
                            {t("managerWorkspace.pendingRh.managerHintBefore")}{" "}
                            <Link to="/workspace/manager/dashboard#rh-actions" className="text-brand-secondary hover:underline">
                                {t("managerWorkspace.pendingRh.dashboard")}
                            </Link>{" "}
                            {t("managerWorkspace.pendingRh.managerHintAfter")}
                        </p>
                    )}
                    <div>
                        <Link to="/workspace/manager/dashboard#rh-actions" className="text-sm text-brand-secondary hover:underline">
                            {t("managerWorkspace.pendingRh.backDashboardHash")}
                        </Link>
                    </div>
                </div>
            ) : null}
            {!isLoading && !isError && !item ? (
                <div className="rounded-xl border border-secondary bg-primary p-4 text-sm text-tertiary">
                    {t("managerWorkspace.pendingRh.notFound")}{" "}
                    <Link to="/workspace/manager/dashboard" className="text-brand-secondary hover:underline">
                        {t("managerWorkspace.pendingRh.backDashboard")}
                    </Link>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
