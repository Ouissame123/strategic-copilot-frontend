import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import ProfilePage from "@/pages/profile-page";

export default function ManagerProfilePage() {
    const { t } = useTranslation("common");

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.profile.shellTitle")}
            description={false}
            omitHeader
        >
            <ProfilePage variant="manager" />
        </WorkspacePageShell>
    );
}
