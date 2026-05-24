import { useTranslation } from "react-i18next";
import { ManagerProfileView } from "@/components/manager/profile/ManagerProfileView";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

export default function ManagerProfilePage() {
    const { t } = useTranslation("common");

    useWorkspaceTopbarMeta(t("managerWorkspace.profile.shellTitle"), t("managerWorkspace.profile.shellSubtitle"));

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.profile.shellTitle")}
            description={false}
            omitHeader
        >
            <div className="min-h-0 bg-slate-50/50 px-1 py-2 dark:bg-slate-950/40 sm:px-2 lg:py-4">
                <ManagerProfileView />
            </div>
        </WorkspacePageShell>
    );
}
