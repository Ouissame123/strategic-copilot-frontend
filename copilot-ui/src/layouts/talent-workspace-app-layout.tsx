import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { getTalentWorkspaceNavItems } from "@/layouts/nav/talent-workspace-nav";

export default function TalentWorkspaceAppLayout() {
    const { t } = useTranslation("nav");
    const items = useMemo(() => getTalentWorkspaceNavItems(t), [t]);
    return <WorkspaceShellLayout workspaceRole="talent" navItems={items} />;
}
