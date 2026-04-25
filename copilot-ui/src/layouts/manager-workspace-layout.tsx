import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { getManagerWorkspaceNavItems } from "@/layouts/nav/manager-workspace-nav";
import { useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { countRhActionsPending } from "@/utils/rh-actions-list";

export default function ManagerWorkspaceLayout() {
    const { t } = useTranslation("nav");
    const rhList = useRhActionsListQuery();
    const pendingRh = countRhActionsPending(rhList.data);

    const items = useMemo(() => {
        const base = getManagerWorkspaceNavItems(t);
        return base.map((item) => {
            if (item.href === "/workspace/manager/rh-requests" && pendingRh > 0) {
                return { ...item, badge: String(pendingRh) };
            }
            return item;
        });
    }, [t, pendingRh]);

    return <WorkspaceShellLayout workspaceRole="manager" navItems={items} />;
}
