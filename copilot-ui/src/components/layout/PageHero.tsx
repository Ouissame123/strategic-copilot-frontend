import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type PageHeroStatus = "default" | "success" | "warning" | "danger" | "info";

export type PageHeroProps = {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    badge?: string;
    status?: PageHeroStatus;
    actions?: ReactNode;
    metrics?: ReactNode;
    className?: string;
};

const badgeByStatus: Record<PageHeroStatus, string> = {
    default: "border-secondary/70 bg-secondary_subtle/60 text-secondary",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
    warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
    danger: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
    info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100",
};

/**
 * En-tête de page manager unifié : carte claire, sans gradient agressif.
 */
export function PageHero({ eyebrow, title, subtitle, badge, status = "default", actions, metrics, className }: PageHeroProps) {
    return (
        <section
            className={cx(
                "rounded-2xl border border-secondary bg-primary p-5 shadow-sm ring-1 ring-secondary/40 lg:p-6",
                className,
            )}
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">{eyebrow}</p>
                    ) : null}
                    <div className={cx("flex flex-wrap items-center gap-2", eyebrow && "mt-1")}>
                        <h1 className="text-xl font-bold tracking-tight text-primary lg:text-2xl">{title}</h1>
                        {badge ? (
                            <span
                                className={cx(
                                    "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    badgeByStatus[status],
                                )}
                            >
                                {badge}
                            </span>
                        ) : null}
                    </div>
                    {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">{subtitle}</p> : null}
                    {metrics ? <div className="mt-4 border-t border-secondary/50 pt-4">{metrics}</div> : null}
                </div>
                {actions ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end">{actions}</div>
                ) : null}
            </div>
        </section>
    );
}
