import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import {
    TALENT_SURFACE,
    TALENT_SURFACE_ACCENT,
    type TalentSurfaceAccent,
} from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

type DashboardSectionCardProps = {
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    accent?: TalentSurfaceAccent;
    children: ReactNode;
    className?: string;
};

export function DashboardSectionCard({
    title,
    subtitle,
    ctaLabel,
    ctaHref,
    accent = "default",
    children,
    className,
}: DashboardSectionCardProps) {
    return (
        <section className={cx(TALENT_SURFACE, TALENT_SURFACE_ACCENT[accent], "p-3", className)}>
            <header className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {accent === "ai" ? (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300">
                            <Sparkles className="size-3.5" aria-hidden />
                        </span>
                    ) : null}
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-primary">{title}</h2>
                        {subtitle ? <p className="truncate text-[10px] text-tertiary">{subtitle}</p> : null}
                    </div>
                </div>
                {ctaLabel && ctaHref ? (
                    <Link
                        to={ctaHref}
                        className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    >
                        {ctaLabel}
                        <ArrowRight className="size-3" aria-hidden />
                    </Link>
                ) : null}
            </header>
            {children}
        </section>
    );
}
