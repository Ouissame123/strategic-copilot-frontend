import { useMemo, useState } from "react";
import { useLocation } from "react-router";
import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { isNavPathActive } from "../nav-path-active";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL de repli (tests) ; par défaut `location.pathname`. */
    activeUrl?: string;
    className?: string;
    items: (NavItemType | NavItemDividerType)[];
}

export const NavList = ({ activeUrl, items, className }: NavListProps) => {
    const location = useLocation();
    const pathname = activeUrl ?? location.pathname;

    const activeItem = useMemo(
        () =>
            items.find(
                (item) =>
                    !item.divider &&
                    (isNavPathActive(pathname, item.href) ||
                        item.items?.some((subItem) => isNavPathActive(pathname, subItem.href))),
            ),
        [items, pathname],
    );

    const [manualOpenHref, setManualOpenHref] = useState<string | null>(null);
    const openHref = manualOpenHref ?? activeItem?.href ?? null;

    return (
        <ul className={cx("mt-4 flex flex-col px-2 lg:px-4", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                const itemActive = isNavPathActive(pathname, item.href);

                if (item.items?.length) {
                    return (
                        <details
                            key={item.label}
                            open={openHref === item.href}
                            className="appearance-none py-0.5"
                            onToggle={(e) => {
                                setManualOpenHref(e.currentTarget.open ? item.href ?? null : null);
                            }}
                        >
                            <NavItemBase
                                href={item.href}
                                badge={item.badge}
                                icon={item.icon}
                                type="collapsible"
                                current={itemActive}
                            >
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="py-0.5">
                                    {item.items.map((childItem) => (
                                        <li key={childItem.label} className="py-0.5">
                                            <NavItemBase
                                                href={childItem.href}
                                                badge={childItem.badge}
                                                type="collapsible-child"
                                                current={isNavPathActive(pathname, childItem.href)}
                                            >
                                                {childItem.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.label} className="py-0.5">
                        <NavItemBase
                            type="link"
                            badge={item.badge}
                            icon={item.icon}
                            href={item.href}
                            current={itemActive}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
