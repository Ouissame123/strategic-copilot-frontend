import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { cx } from "@/utils/cx";
import type { WorkspaceRole } from "@/types/workspace-role";
import { RH_CARD, RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY, WS_MUTED_SURFACE } from "@/utils/rh-workspace-theme";
import { workspaceRoleAccentClasses, workspaceRoleHeaderStripeClass, workspaceRoleSolidChipClasses } from "@/utils/workspace-role-styles";
import { useTranslation } from "react-i18next";

export type WorkspaceTab = { href: string; label: string; end?: boolean };

type WorkspacePageShellProps = {
    role: WorkspaceRole;
    eyebrow: string;
    title: string;
    description?: ReactNode;
    /** Masque le bandeau titre par défaut (ex. page avec hero custom). */
    omitHeader?: boolean;
    /** @deprecated Prefer window scroll — kept for API compat, no longer locks viewport height. */
    fillHeight?: boolean;
    tabs?: WorkspaceTab[];
    actions?: ReactNode;
    children: ReactNode;
};

export function WorkspacePageShell({ role, eyebrow, title, description, omitHeader = false, fillHeight: _fillHeight = false, tabs, actions, children }: WorkspacePageShellProps) {
    const { t } = useTranslation("common");
    const isRh = role === "rh";

    return (
        <div className="space-y-6">
            {!omitHeader ? (
                isRh ? (
                    <div className={cx(RH_CARD, "p-4 md:p-5")}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className={cx("text-xs font-medium uppercase tracking-wide", RH_TEXT_MUTED)}>{eyebrow}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <h1 className={cx("text-xl font-semibold tracking-tight md:text-2xl", RH_TEXT_PRIMARY)}>{title}</h1>
                                    <span
                                        className={cx(
                                            "rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium dark:border-slate-700",
                                            WS_MUTED_SURFACE,
                                            RH_TEXT_SECONDARY,
                                        )}
                                    >
                                        {t(`workspaceRoles.${role}`)}
                                    </span>
                                </div>
                                {description != null && description !== false && (
                                    <div className={cx("mt-2 text-sm", RH_TEXT_MUTED)}>{description}</div>
                                )}
                            </div>
                            {actions}
                        </div>
                    </div>
                ) : (
                    <div
                        className={cx(
                            "relative overflow-hidden rounded-3xl border border-secondary/90 bg-gradient-to-br from-primary via-primary to-brand-primary_alt/15 p-4 shadow-sm ring-1 ring-secondary/70 md:p-5",
                            workspaceRoleAccentClasses(role),
                        )}
                    >
                        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-primary_alt/30 blur-3xl" />
                        <div className="pointer-events-none absolute -left-20 bottom-0 size-52 rounded-full bg-brand-secondary/10 blur-3xl" />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,0.35),transparent_46%)]" />
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                                {description != null && description !== false && (
                                    <div className="mt-2 text-sm text-secondary md:text-md">{description}</div>
                                )}
                            </div>
                            {actions}
                        </div>
                        <div className={cx("relative mt-4 h-1 w-full rounded-full bg-gradient-to-r", workspaceRoleHeaderStripeClass(role))} />
                    </div>
                )
            ) : null}

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
                                        ? isRh
                                            ? "bg-ws-nav-bg-active text-ws-accent ring-1 ring-ws-border"
                                            : cx("ring-1", workspaceRoleAccentClasses(role))
                                        : "text-tertiary hover:bg-primary_hover hover:text-secondary",
                                )
                            }
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </nav>
            )}

            <div className="w-full space-y-6">{children}</div>
        </div>
    );
}
