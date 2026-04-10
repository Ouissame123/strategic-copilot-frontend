import type { FC, ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { ProjectLogo } from "@/components/foundations/logo/project-logo";
import { ThemeToggle } from "@/components/application/theme-toggle/theme-toggle";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "./base-components/mobile-header";
import { NavItemBase } from "./base-components/nav-item";
import { NavList } from "./base-components/nav-list";

type NavItem = {
    /** Label text for the nav item. */
    label: string;
    /** URL to navigate to when the nav item is clicked. */
    href: string;
    /** Whether the nav item is currently active. */
    current?: boolean;
    /** Icon component to display. */
    icon?: FC<{ className?: string }>;
    /** Badge to display. */
    badge?: ReactNode;
    /** List of sub-items to display. */
    items?: NavItem[];
};

interface HeaderNavigationBaseProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItem[];
    /** List of sub-items to display. */
    subItems?: NavItem[];
    /** Content to display in the trailing position. */
    trailingContent?: ReactNode;
    /** Whether to hide the bottom border. */
    hideBorder?: boolean;
}

export const HeaderNavigationBase = ({
    items,
    subItems,
    trailingContent,
    hideBorder = false,
}: HeaderNavigationBaseProps) => {
    const activeSubNavItems = subItems || items.find((item) => item.current && item.items && item.items.length > 0)?.items;

    const showSecondaryNav = activeSubNavItems && activeSubNavItems.length > 0;

    return (
        <>
            <MobileNavigationHeader>
                <aside className="flex h-full max-w-full flex-col justify-between overflow-auto border-r border-secondary bg-primary pt-4 lg:pt-6">
                    <div className="flex flex-col gap-5 px-4 lg:px-5">
                        <ProjectLogo className="h-8" />
                        <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} />
                    </div>

                    <NavList items={items} />
                </aside>
            </MobileNavigationHeader>

            <header className="max-lg:hidden">
                <section
                    className={cx(
                        "flex h-16 w-full items-center justify-center bg-primary md:h-18",
                        (!hideBorder || showSecondaryNav) && "border-b border-secondary",
                    )}
                >
                    <div className="flex w-full max-w-container justify-between pr-3 pl-4 md:px-8">
                        <div className="flex flex-1 items-center gap-4">
                            <a
                                aria-label="Go to homepage"
                                href="/"
                                className="rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <ProjectLogo className="h-8" />
                            </a>

                            <nav>
                                <ul className="flex items-center gap-0.5">
                                    {items.map((item) => (
                                        <li key={item.label} className="py-0.5">
                                            <NavItemBase icon={item.icon} href={item.href} current={item.current} badge={item.badge} type="link">
                                                {item.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            {trailingContent}
                        </div>
                    </div>
                </section>

                {showSecondaryNav && (
                    <section className={cx("flex h-16 w-full items-center justify-center bg-primary", !hideBorder && "border-b border-secondary")}>
                        <div className="flex w-full max-w-container items-center justify-between gap-8 px-8">
                            <nav>
                                <ul className="flex items-center gap-0.5">
                                    {activeSubNavItems.map((item) => (
                                        <li key={item.label} className="py-0.5">
                                            <NavItemBase icon={item.icon} href={item.href} current={item.current} badge={item.badge} type="link">
                                                {item.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            <Input shortcut aria-label="Search" placeholder="Search" icon={SearchLg} size="sm" className="max-w-xs" />
                        </div>
                    </section>
                )}
            </header>
        </>
    );
};
