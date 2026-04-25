import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { CopilotTriggerButton } from "@/components/copilot";
import { AppGlobalShortcuts } from "@/components/app/app-global-shortcuts";
import { AppLayoutHeaderActions } from "@/components/app/app-layout-header-actions";
import { AppLayoutHeaderLeading } from "@/components/app/app-layout-header-leading";
import { SidebarNavigationSimple } from "@/components/app/navigation";
import { ThemeToggle } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/i18n";
import { NavAccountCard } from "@/components/application/app-navigation/base-components/nav-account-card";
import type { NavItemType } from "@/components/application/app-navigation/config";
import type { WorkspaceRole } from "@/types/workspace-role";
import { workspaceRoleHeaderStripeClass } from "@/utils/workspace-role-styles";
import { cx } from "@/utils/cx";

type WorkspaceShellLayoutProps = {
    workspaceRole: WorkspaceRole;
    navItems: NavItemType[];
    children?: ReactNode;
};

/**
 * En-tête + barre latérale pour un seul rôle workspace.
 * Aucune branche sur `role` : le parent fournit les items de navigation.
 */
export function WorkspaceShellLayout({ workspaceRole, navItems, children }: WorkspaceShellLayoutProps) {
    const { pathname } = useLocation();

    return (
        <div className="min-h-screen bg-primary lg:flex">
            <SidebarNavigationSimple activeUrl={pathname} items={navItems} />
            <div className="flex min-h-screen flex-1 flex-col bg-secondary_subtle">
                <header className="flex min-h-14 shrink-0 flex-col items-stretch border-b border-secondary bg-primary shadow-xs md:px-8 md:py-0">
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-0 md:py-4">
                        <AppLayoutHeaderLeading />
                        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 md:gap-3">
                            <AppLayoutHeaderActions />
                            <AppGlobalShortcuts />
                            <CopilotTriggerButton />
                            <LanguageSwitcher />
                            <ThemeToggle />
                            <NavAccountCard compact showProfileAction={false} />
                        </div>
                    </div>
                    <div className={cx("h-0.5 w-full bg-gradient-to-r md:rounded-b-sm", workspaceRoleHeaderStripeClass(workspaceRole))} aria-hidden />
                </header>
                <main className="flex-1 p-5 md:p-8">
                    <div className="mx-auto w-full max-w-container">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                {children ?? <Outlet />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
