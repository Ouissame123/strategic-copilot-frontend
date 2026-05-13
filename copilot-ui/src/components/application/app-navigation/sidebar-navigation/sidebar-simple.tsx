import type { ReactNode } from "react";
import { useState } from "react";
import { LogOut01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { ProjectLogo } from "@/components/foundations/logo/project-logo";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Affiche le bouton « Déconnexion » en bas (desktop et drawer mobile). */
    showSidebarLogout?: boolean;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
}

export const SidebarNavigationSimple = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    showSidebarLogout = true,
    hideBorder = false,
    className,
}: SidebarNavigationProps) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const MAIN_SIDEBAR_WIDTH = 296;

    const content = (
        <aside
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                } as React.CSSProperties
            }
            className={cx(
                "flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-secondary pt-4 lg:w-(--width) lg:pt-6",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
        >
            <div className="shrink-0 px-4 lg:px-5">
                <ProjectLogo className="h-8" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <NavList activeUrl={activeUrl} items={items} />
            </div>

            <div className="shrink-0 border-t border-secondary/80 bg-secondary px-2 py-3 lg:px-4 lg:py-4">
                {footerItems.length > 0 ? (
                    <ul className="mb-3 flex flex-col">
                        {footerItems.map((item) => (
                            <li key={item.label} className="py-0.5">
                                <NavItemBase badge={item.badge} icon={item.icon} href={item.href} type="link" current={item.href === activeUrl}>
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {featureCard ? <div className={footerItems.length > 0 ? "mb-3" : ""}>{featureCard}</div> : null}

                {showSidebarLogout ? (
                    <button
                        type="button"
                        disabled={isLoggingOut}
                        className={cx(
                            "group relative flex w-full cursor-pointer items-center rounded-md border border-transparent px-3 py-2.5 outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                            "hover:text-[#ef4444] focus-visible:text-[#ef4444]",
                            isLoggingOut && "bg-[#ef4444]/10 text-[#ef4444] ring-1 ring-[#ef4444]/25",
                        )}
                        onClick={() => {
                            setIsLoggingOut(true);
                            void logout().finally(() => navigate("/login", { replace: true }));
                        }}
                    >
                        <LogOut01 aria-hidden className="mr-2 size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover:text-[#ef4444]" />
                        <span className="flex-1 truncate text-left text-md font-semibold text-secondary transition-inherit-all group-hover:text-[#ef4444]">
                            Déconnexion
                        </span>
                    </button>
                ) : null}
            </div>
        </aside>
    );

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH,
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
