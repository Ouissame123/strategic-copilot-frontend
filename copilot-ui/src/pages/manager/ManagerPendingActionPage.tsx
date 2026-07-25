import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useDashboard } from "@/hooks/useDashboard";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";

/**
 * Détail d’une action de validation (même source dashboard V3 — file Helper).
 * Les managers ne passent pas par l’espace `/workspace/rh` (rôle réservé RH).
 */
export default function ManagerPendingActionPage() {
    const { t } = useTranslation("common");
    const { actionId } = useParams();
    const { user } = useAuth();
    const { data, isLoading, isError } = useDashboard("mine");

    const item = useMemo(() => {
        if (!data || !actionId) return null;
        // v4_factual : plus de validation_queue sur le dashboard — file dédiée Validations Copilot.
        const q = (data as { validation_queue?: {
            conflicts?: Array<{ id: string; type: string; title: string; conflicting_project?: string; talent_name?: string; why_explanation?: string }>;
            missing_justif?: Array<{ id: string; type: string; title: string; talent_name?: string; why_explanation?: string }>;
            standard_queue?: Array<{ id: string; type: string; title: string; talent_name?: string; why_explanation?: string }>;
        } }).validation_queue;
        if (!q) return null;
        const all = [
            ...(q.conflicts ?? []).map((c) => ({
                id: c.id,
                type: c.type,
                message: c.title,
                project_name: c.conflicting_project || null,
                talent_name: c.talent_name,
                why: c.why_explanation,
            })),
            ...(q.missing_justif ?? []).map((c) => ({
                id: c.id,
                type: c.type,
                message: c.title,
                project_name: null as string | null,
                talent_name: c.talent_name,
                why: c.why_explanation,
            })),
            ...(q.standard_queue ?? []).map((c) => ({
                id: c.id,
                type: c.type,
                message: c.title,
                project_name: null as string | null,
                talent_name: c.talent_name,
                why: c.why_explanation,
            })),
        ];
        return all.find((a) => a.id === actionId) ?? null;
    }, [data, actionId]);

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
                    <p className="text-base font-medium text-primary">{item.message || t("managerWorkspace.relative.emDash")}</p>
                    <p className="text-sm text-tertiary">
                        {item.talent_name}
                        {item.project_name ? ` · ${item.project_name}` : ""}
                    </p>
                    {item.why ? <p className="text-sm text-tertiary">{item.why}</p> : null}
                    {user?.role === "rh" ? (
                        <Link
                            to={`/workspace/manager/hr-requests?action=${encodeURIComponent(item.id)}`}
                            className="inline-flex text-sm font-medium text-brand-secondary hover:underline"
                        >
                            {t("managerWorkspace.pendingRh.openInRh")}
                        </Link>
                    ) : (
                        <p className="text-sm text-tertiary">
                            {t("managerWorkspace.pendingRh.managerHintBefore")}{" "}
                            <Link to="/workspace/manager/validations" className="text-brand-secondary hover:underline">
                                {t("managerWorkspace.pendingRh.dashboard")}
                            </Link>{" "}
                            {t("managerWorkspace.pendingRh.managerHintAfter")}
                        </p>
                    )}
                    <div>
                        <Link to="/workspace/manager/dashboard" className="text-sm text-brand-secondary hover:underline">
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
