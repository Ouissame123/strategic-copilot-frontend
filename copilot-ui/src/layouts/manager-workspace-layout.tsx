import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { getManagerWorkspaceNavItems } from "@/layouts/nav/manager-workspace-nav";

export default function ManagerWorkspaceLayout() {
    const { t } = useTranslation("nav");

    const items = useMemo(() => getManagerWorkspaceNavItems(t), [t]);

    return <WorkspaceShellLayout workspaceRole="manager" navItems={items} />;
}
