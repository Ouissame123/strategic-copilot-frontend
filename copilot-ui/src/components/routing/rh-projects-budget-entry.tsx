import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { useRhWorkspaceNavItems } from "@/layouts/nav/use-rh-workspace-nav";
import RhProjectsBudgetPage from "@/pages/workspace/rh/rh-projects-budget-page";

/** `/workspace/rh/projects-budget` — RH (édition) et manager (lecture seule). */
export function RhProjectsBudgetEntry() {
    const items = useRhWorkspaceNavItems();
    return (
        <WorkspaceShellLayout workspaceRole="rh" navItems={items}>
            <RhProjectsBudgetPage />
        </WorkspaceShellLayout>
    );
}
