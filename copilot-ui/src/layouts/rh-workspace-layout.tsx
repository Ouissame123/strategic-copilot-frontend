import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { useRhWorkspaceNavItems } from "@/layouts/nav/use-rh-workspace-nav";

export default function RhWorkspaceLayout() {
    const items = useRhWorkspaceNavItems();

    return <WorkspaceShellLayout workspaceRole="rh" navItems={items} />;
}
