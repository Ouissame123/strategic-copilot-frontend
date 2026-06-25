import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { useRhWorkspaceNavItems } from "@/layouts/nav/use-rh-workspace-nav";
import RhActionsPage from "@/pages/workspace/rh/rh-actions-page";

/** `/workspace/rh/actions` — demandes managers, matching IA, mobilité. */
export function RhActionsEntry() {
    const items = useRhWorkspaceNavItems();
    return (
        <WorkspaceShellLayout workspaceRole="rh" navItems={items}>
            <RhActionsPage />
        </WorkspaceShellLayout>
    );
}
