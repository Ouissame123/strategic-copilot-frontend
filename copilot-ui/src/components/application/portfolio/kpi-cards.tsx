import type { ComponentType } from "react";
import { AlertCircle, Folder, LayersTwo02, ZapFast } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { BadgeWithDot } from "@/components/base/badges/badges";
import type { PortfolioSummary } from "@/hooks/use-portfolio";

interface KpiCardProps {
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    statusColor: "success" | "warning" | "gray" | "brand";
    statusLabel: string;
}

const KpiCard = ({ title, value, description, icon: Icon, statusColor, statusLabel }: KpiCardProps) => {
    return (
        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-secondary">{title}</p>
                    <p className="mt-2 text-display-sm font-semibold text-primary md:text-display-md">{value}</p>
                </div>
                <div className="rounded-xl bg-secondary p-2.5">
                    <Icon className="size-5 text-fg-secondary" />
                </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-xs text-tertiary md:text-sm">{description}</p>
                <BadgeWithDot type="pill-color" size="sm" color={statusColor}>
                    {statusLabel}
                </BadgeWithDot>
            </div>
        </article>
    );
};

interface KpiCardsProps {
    summary: PortfolioSummary;
}

export const KpiCards = ({ summary }: KpiCardsProps) => {
    const { t } = useTranslation("portfolio");

    const cards = [
        {
            title: t("kpis.total.title"),
            value: String(summary.totalProjects),
            description: t("kpis.total.description"),
            icon: LayersTwo02,
            statusColor: "brand" as const,
            statusLabel: t("kpis.total.badge"),
        },
        {
            title: t("kpis.active.title"),
            value: String(summary.activeProjects),
            description: t("kpis.active.description"),
            icon: Folder,
            statusColor: "success" as const,
            statusLabel: t("kpis.active.badge"),
        },
        {
            title: t("kpis.risk.title"),
            value: String(summary.highRiskProjects),
            description: t("kpis.risk.description"),
            icon: AlertCircle,
            statusColor: summary.highRiskProjects > 0 ? ("warning" as const) : ("success" as const),
            statusLabel:
                summary.highRiskProjects > 0 ? t("kpis.risk.badgeAttention") : t("kpis.risk.badgeStable"),
        },
        {
            title: t("kpis.budget.title"),
            value: `${summary.averageBudgetUsage}%`,
            description: t("kpis.budget.description"),
            icon: ZapFast,
            statusColor: summary.averageBudgetUsage > 80 ? ("warning" as const) : ("success" as const),
            statusLabel:
                summary.averageBudgetUsage > 80 ? t("kpis.budget.badgeHigh") : t("kpis.budget.badgeControl"),
        },
    ];

    return (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <KpiCard key={card.title} {...card} />
            ))}
        </section>
    );
};
