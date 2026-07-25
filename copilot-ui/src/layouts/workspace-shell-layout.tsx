import type { ReactNode } from "react";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { CopilotTriggerButton } from "@/components/copilot";
import { AppGlobalShortcuts } from "@/components/app/app-global-shortcuts";
import { AppLayoutHeaderActions } from "@/components/app/app-layout-header-actions";
import { AppLayoutHeaderLeading } from "@/components/app/app-layout-header-leading";
import { ManagerNotificationsTopbarDropdown } from "@/components/app/manager-notifications-topbar";
import { RhNotificationsTopbarDropdown } from "@/components/rh/RhNotificationsTopbarDropdown";
import { TalentNotificationsBell } from "@/components/talent/layout/TalentTopbar";
import { ProfileMenu } from "@/components/talent/layout/ProfileMenu";
import { SidebarNavigationSimple } from "@/components/app/navigation";
import { ThemeToggle } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/i18n";
import { NavAccountCard } from "@/components/application/app-navigation/base-components/nav-account-card";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { WorkspaceTopbarMetaProvider, useWorkspaceTopbarMetaState } from "@/layouts/workspace-topbar-meta";
import type { WorkspaceRole } from "@/types/workspace-role";
import {
    RH_SIDEBAR,
    RH_SIDEBAR_NAV_ACTIVE,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TOPBAR,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type WorkspaceShellLayoutProps = {
    workspaceRole: WorkspaceRole;
    navItems: NavItemType[];
    navFooterItems?: NavItemType[];
    sidebarBelowLogo?: ReactNode;
    children?: ReactNode;
};

function WorkspaceShellHeaderLeading({ rhTone }: { rhTone?: boolean }) {
    const meta = useWorkspaceTopbarMetaState();
    const hasTitle = Boolean(meta.title.trim());
    const hasTrailing = meta.trailing != null && meta.trailing !== false;

    if (hasTitle) {
        return (
            <div className="min-w-0 flex-1 pr-2 text-start md:pr-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1
                            className={cx(
                                "truncate text-lg font-semibold tracking-tight md:text-xl",
                                rhTone ? RH_TEXT_PRIMARY : "text-primary",
                            )}
                        >
                            {meta.title}
                        </h1>
                        {hasTrailing ? <div className="flex shrink-0 items-center">{meta.trailing}</div> : null}
                    </div>
                </div>
                {meta.subtitle ? (
                    <p
                        className={cx(
                            "mt-0.5 line-clamp-2 text-sm leading-snug md:text-[0.9375rem]",
                            rhTone ? RH_TEXT_MUTED : "text-tertiary",
                        )}
                    >
                        {meta.subtitle}
                    </p>
                ) : null}
            </div>
        );
    }

    if (hasTrailing) {
        return (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 md:pr-4">
                <AppLayoutHeaderLeading />
                <div className="flex shrink-0 items-center">{meta.trailing}</div>
            </div>
        );
    }

    return <AppLayoutHeaderLeading />;
}

/**
 * En-tête + barre latérale pour un seul rôle workspace.
 * Aucune branche sur `role` : le parent fournit les items de navigation.
 */
const FULL_WIDTH_MAIN_PATHS = [
    "/workspace/manager/rh-requests",
    "/workspace/manager/risques-alertes",
    "/workspace/manager/notifications",
];

function isManagerMissionControlPage(pathname: string): boolean {
    return /^\/workspace\/manager\/projects\/[^/]+$/.test(pathname);
}

function isFullWidthWorkspaceMain(pathname: string): boolean {
    if (isManagerMissionControlPage(pathname)) return true;
    return FULL_WIDTH_MAIN_PATHS.some((segment) => pathname === segment || pathname.startsWith(`${segment}/`));
}

export function WorkspaceShellLayout({
    workspaceRole,
    navItems,
    navFooterItems,
    sidebarBelowLogo,
    children,
}: WorkspaceShellLayoutProps) {
    const location = useLocation();
    const { pathname } = location;
    const fullWidthMain = isFullWidthWorkspaceMain(pathname);
    const isRh = workspaceRole === "rh";

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <WorkspaceTopbarMetaProvider>
            <div className="min-h-dvh bg-surface-0 lg:flex lg:items-start">
                <SidebarNavigationSimple
                    activeUrl={pathname}
                    items={navItems}
                    footerItems={navFooterItems}
                    belowLogo={sidebarBelowLogo}
                    className={
                        isRh
                            ? cx(RH_SIDEBAR, RH_SIDEBAR_NAV_ACTIVE)
                            : "!bg-surface-1 [&_.bg-secondary]:!bg-surface-1"
                    }
                />
                <div className="flex w-full min-w-0 flex-1 flex-col bg-surface-0">
                    <header
                        className={cx(
                            "sticky top-0 z-30 flex min-h-12 shrink-0 flex-col items-stretch border-b md:px-6 md:py-0",
                            isRh ? cx("border-b", RH_TOPBAR) : "border-secondary/80 bg-surface-1 shadow-sm",
                        )}
                    >
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-0 md:py-2.5">
                            <WorkspaceShellHeaderLeading rhTone={isRh} />
                            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                                <AppLayoutHeaderActions />
                                <AppGlobalShortcuts />
                                {workspaceRole === "manager" ? (
                                    <ManagerNotificationsTopbarDropdown />
                                ) : workspaceRole === "rh" ? (
                                    <RhNotificationsTopbarDropdown />
                                ) : workspaceRole === "talent" ? (
                                    <TalentNotificationsBell />
                                ) : (
                                    <CopilotTriggerButton />
                                )}
                                {workspaceRole !== "talent" ? (
                                    <>
                                        <LanguageSwitcher />
                                        <ThemeToggle />
                                        <NavAccountCard compact showProfileAction={false} />
                                    </>
                                ) : (
                                    <>
                                        <LanguageSwitcher />
                                        <ThemeToggle />
                                    </>
                                )}
                                {workspaceRole === "talent" ? <ProfileMenu /> : null}
                            </div>
                        </div>
                    </header>
                    <main
                        className={cx(
                            "w-full",
                            fullWidthMain ? "p-0" : isRh ? "p-4 md:p-6" : "p-5 md:p-8",
                        )}
                    >
                        <div
                            className={cx(
                                "w-full",
                                !fullWidthMain && "mx-auto max-w-container",
                            )}
                        >
                            <div className="w-full">
                                {children ?? <Outlet key={pathname} />}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </WorkspaceTopbarMetaProvider>
    );
}
