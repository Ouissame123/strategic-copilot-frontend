import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import { useRhWorkspaceNavItems } from "@/layouts/nav/use-rh-workspace-nav";
import RhRisksPage from "@/pages/workspace/rh/rh-risks-page";

/** `/workspace/rh/risks` — Watchdog talents RH (WF_RH_Risks_Watchdog_v1). */
export function RhRisksEntry() {
    const items = useRhWorkspaceNavItems();
    return (
        <WorkspaceShellLayout workspaceRole="rh" navItems={items}>
            <RhRisksPage />
        </WorkspaceShellLayout>
    );
}
