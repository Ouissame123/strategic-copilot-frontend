import type { ComponentType } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Folder, LayersTwo02, ZapFast } from "@untitledui/icons";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { BadgeWithDot } from "@/components/base/badges/badges";
import type { PortfolioSummary } from "@/hooks/use-portfolio";
import { cx } from "@/utils/cx";

function ProgressTrack({
    value,
    className,
    variant = "brand",
}: {
    value: number;
    className?: string;
    variant?: "brand" | "success" | "warning" | "neutral";
}) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const fill =
        variant === "success"
            ? "bg-gradient-to-r from-success-primary to-emerald-600 dark:from-success-primary dark:to-emerald-500"
            : variant === "warning"
              ? "bg-gradient-to-r from-warning-primary to-amber-600 dark:from-warning-primary dark:to-amber-500"
              : variant === "neutral"
                ? "bg-gradient-to-r from-fg-secondary/40 to-fg-secondary/55 dark:from-fg-secondary/35"
                : "bg-gradient-to-r from-utility-brand-500 to-utility-brand-600 transition-[width] duration-500 ease-out dark:from-utility-brand-400 dark:to-utility-brand-500";
    return (
        <div className={cx("h-2 w-full overflow-hidden rounded-full bg-secondary/80", className)} role="presentation">
            <div className={cx("h-full rounded-full transition-[width] duration-500 ease-out", fill)} style={{ width: `${v}%` }} />
        </div>
    );
}

interface KpiCardProps {
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    statusColor: "success" | "warning" | "gray" | "brand";
    statusLabel: string;
    progress: number;
    /** Couleur de la barre sous le chiffre (ex. vert = actifs / total). */
    progressVariant?: "brand" | "success" | "warning" | "neutral";
    accent: "brand" | "success" | "warning" | "budget";
    trend?: { label: string; direction: "up" | "down" | "neutral"; positive?: boolean };
}

const accentSurface: Record<KpiCardProps["accent"], string> = {
    brand: "from-utility-brand-50/90 to-primary dark:from-utility-brand-950/30",
    success: "from-success-primary/[0.09] to-primary dark:from-success-primary/[0.14]",
    warning: "from-warning-primary/[0.1] to-primary dark:from-warning-primary/[0.12]",
    budget:
        "from-fg-secondary/[0.05] to-primary dark:from-fg-secondary/[0.1]",
};

const accentBorder: Record<KpiCardProps["accent"], string> = {
    brand: "border-utility-brand-200/50 dark:border-utility-brand-800/40",
    success: "border-success-primary/25 dark:border-success-primary/20",
    warning: "border-warning-primary/30 dark:border-warning-primary/25",
    budget: "border-secondary/60",
};

const kpiCardShell =
    "group relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-md ring-1 ring-secondary/40 transition-shadow duration-300 hover:shadow-lg dark:shadow-lg dark:ring-secondary/30 dark:hover:shadow-xl md:p-7";

const KpiCard = ({
    title,
    value,
    description,
    icon: Icon,
    statusColor,
    statusLabel,
    progress,
    progressVariant = "brand",
    accent,
    trend,
}: KpiCardProps) => {
    return (
        <motion.article layout className={cx(kpiCardShell, accentSurface[accent], accentBorder[accent])} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary">{title}</p>
                    <p className="font-kpi-mono mt-2 text-display-md font-semibold tracking-tight text-primary md:text-[2.25rem] md:leading-tight">
                        {value}
                    </p>
                    {trend ? (
                        <p
                            className={cx(
                                "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
                                trend.direction === "neutral" && "text-tertiary",
                                trend.direction !== "neutral" && trend.positive === true && "text-success-primary",
                                trend.direction !== "neutral" && trend.positive === false && "text-error-primary",
                            )}
                        >
                            {trend.direction === "up" ? <ArrowUp className="size-3.5 shrink-0" aria-hidden /> : null}
                            {trend.direction === "down" ? <ArrowDown className="size-3.5 shrink-0" aria-hidden /> : null}
                            {trend.label}
                        </p>
                    ) : null}
                </div>
                <div className="rounded-2xl bg-primary/85 p-3 shadow-xs ring-1 ring-secondary/50 dark:bg-primary_alt/65">
                    <Icon className="size-5 text-fg-secondary transition group-hover:scale-105" />
                </div>
            </div>
            <div className="mt-auto space-y-2.5 pt-5">
                <ProgressTrack value={progress} variant={progressVariant} />
                <div className="flex items-end justify-between gap-3">
                    <p className="text-xs text-tertiary md:text-sm">{description}</p>
                    <BadgeWithDot type="pill-color" size="sm" color={statusColor}>
                        {statusLabel}
                    </BadgeWithDot>
                </div>
            </div>
        </motion.article>
    );
};

interface KpiCardsProps {
    summary: PortfolioSummary;
}

export const KpiCards = ({ summary }: KpiCardsProps) => {
    const { t } = useTranslation("portfolio");
    const denom = Math.max(summary.totalProjects, 1);
    const activeShare = Math.round((summary.activeProjects / denom) * 100);
    const riskShare = Math.round((summary.highRiskProjects / denom) * 100);

    const cards: KpiCardProps[] = [
        {
            title: t("kpis.total.title"),
            value: String(summary.totalProjects),
            description: t("kpis.total.description"),
            icon: LayersTwo02,
            statusColor: "brand",
            statusLabel: t("kpis.total.badge"),
            progress: 100,
            progressVariant: "brand",
            accent: "brand",
            trend: {
                label: t("kpis.active.ratioOfTotal", { active: summary.activeProjects, total: summary.totalProjects }),
                direction: "neutral",
                positive: true,
            },
        },
        {
            title: t("kpis.active.title"),
            value: String(summary.activeProjects),
            description: t("kpis.active.ratioOfTotal", { active: summary.activeProjects, total: Math.max(summary.totalProjects, 1) }),
            icon: Folder,
            statusColor: "success",
            statusLabel: t("kpis.active.badge"),
            progress: activeShare,
            progressVariant: "success",
            accent: "success",
            trend:
                summary.totalProjects > 0
                    ? { label: `${activeShare}%`, direction: "up", positive: true }
                    : { label: "—", direction: "neutral", positive: true },
        },
        {
            title: t("kpis.risk.title"),
            value: String(summary.highRiskProjects),
            description: t("kpis.risk.description"),
            icon: AlertCircle,
            statusColor: summary.highRiskProjects > 0 ? "warning" : "success",
            statusLabel: summary.highRiskProjects > 0 ? t("kpis.risk.badgeAttention") : t("kpis.risk.badgeStable"),
            progress: riskShare,
            progressVariant: summary.highRiskProjects > 0 ? "warning" : "neutral",
            accent: "warning",
            trend: {
                label:
                    summary.highRiskProjects > 0
                        ? t("kpis.trend.riskAlert", { count: summary.highRiskProjects })
                        : t("kpis.trend.riskStable"),
                direction: summary.highRiskProjects > 0 ? "up" : "neutral",
                positive: summary.highRiskProjects === 0,
            },
        },
        {
            title: t("kpis.budget.title"),
            value: `${summary.averageBudgetUsage}%`,
            description: t("kpis.budget.description"),
            icon: ZapFast,
            statusColor: summary.averageBudgetUsage > 80 ? "warning" : "success",
            statusLabel: summary.averageBudgetUsage > 80 ? t("kpis.budget.badgeHigh") : t("kpis.budget.badgeControl"),
            progress: summary.averageBudgetUsage,
            progressVariant: summary.averageBudgetUsage > 80 ? "warning" : "neutral",
            accent: "budget",
            trend: {
                label: summary.averageBudgetUsage > 80 ? t("kpis.trend.budgetPressure") : t("kpis.trend.budgetOk"),
                direction: summary.averageBudgetUsage > 80 ? "up" : "neutral",
                positive: summary.averageBudgetUsage <= 80,
            },
        },
    ];

    return (
        <motion.section
            className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06 } },
            }}
        >
            {cards.map((card) => (
                <motion.div
                    key={card.title}
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
                    }}
                >
                    <KpiCard {...card} />
                </motion.div>
            ))}
        </motion.section>
    );
};
