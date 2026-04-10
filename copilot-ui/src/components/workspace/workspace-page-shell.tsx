import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { cx } from "@/utils/cx";
import type { WorkspaceRole } from "@/types/workspace-role";
import { workspaceRoleAccentClasses, workspaceRoleHeaderStripeClass, workspaceRoleSolidChipClasses } from "@/utils/workspace-role-styles";
import { useTranslation } from "react-i18next";

export type WorkspaceTab = { href: string; label: string; end?: boolean };

type WorkspacePageShellProps = {
    role: WorkspaceRole;
    eyebrow: string;
    title: string;
    description?: string;
    tabs?: WorkspaceTab[];
    actions?: ReactNode;
    children: ReactNode;
};

export function WorkspacePageShell({ role, eyebrow, title, description, tabs, actions, children }: WorkspacePageShellProps) {
    const { t } = useTranslation("common");

    return (
        <div className="space-y-6">
            <div
                className={cx(
                    "rounded-2xl border bg-primary p-5 shadow-xs ring-1 md:p-6",
                    workspaceRoleAccentClasses(role),
                )}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{eyebrow}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{title}</h1>
                            <span
                                className={cx(
                                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                    workspaceRoleSolidChipClasses(role),
                                )}
                            >
                                {t(`workspaceRoles.${role}`)}
                            </span>
                        </div>
                        {description && <p className="mt-2 text-sm text-secondary md:text-md">{description}</p>}
                    </div>
                    {actions}
                </div>
                <div className={cx("mt-4 h-1 w-full rounded-full bg-gradient-to-r", workspaceRoleHeaderStripeClass(role))} />
            </div>

            {tabs && tabs.length > 0 && (
                <nav className="flex flex-wrap gap-2 border-b border-secondary pb-3" aria-label={eyebrow}>
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.href}
                            to={tab.href}
                            end={tab.end}
                            className={({ isActive }) =>
                                cx(
                                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                                    isActive
                                        ? cx("ring-1", workspaceRoleAccentClasses(role))
                                        : "text-tertiary hover:bg-primary_hover hover:text-secondary",
                                )
                            }
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </nav>
            )}

            <div className="space-y-6">{children}</div>
        </div>
    );
}
