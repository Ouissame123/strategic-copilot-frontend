import type { ReactNode } from "react";
import { WorkspaceShellLayout } from "@/layouts/workspace-shell-layout";
import {
    useTalentWorkspaceFooterNavItems,
    useTalentWorkspaceNavItems,
} from "@/layouts/nav/use-talent-workspace-nav";
import { TalentSidebarGreeting } from "@/components/talent/layout/TalentSidebarGreeting";
import { TalentHelperFloating } from "@/components/talent/helper/TalentHelperFloating";

export default function TalentWorkspaceAppLayout({ children }: { children?: ReactNode }) {
    const items = useTalentWorkspaceNavItems();
    const footerItems = useTalentWorkspaceFooterNavItems();

    return (
        <>
            <WorkspaceShellLayout
                workspaceRole="talent"
                navItems={items}
                navFooterItems={footerItems}
                sidebarBelowLogo={<TalentSidebarGreeting />}
            >
                {children}
            </WorkspaceShellLayout>
            <TalentHelperFloating />
        </>
    );
}
