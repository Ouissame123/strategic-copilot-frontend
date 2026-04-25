import { Clock } from "@untitledui/icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import type { PortfolioProject } from "@/hooks/use-portfolio";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

const ACTIVITY_LIMIT = 8;

const activityShell =
    "rounded-2xl border border-secondary/65 bg-primary p-6 shadow-md ring-1 ring-secondary/40 dark:shadow-lg dark:ring-secondary/30 md:p-8";

interface PortfolioActivityListProps {
    projects: PortfolioProject[];
    isLoading: boolean;
}

export function PortfolioActivityList({ projects, isLoading }: PortfolioActivityListProps) {
    const { t, i18n } = useTranslation("portfolio");
    const paths = useWorkspacePaths();

    const locale =
        i18n.language.startsWith("ar") ? "ar-EG" : i18n.language.startsWith("en") ? "en-US" : "fr-FR";

    const items = useMemo(() => {
        return [...projects]
            .sort((a, b) => {
                const ta = new Date(a.updatedAt).getTime();
                const tb = new Date(b.updatedAt).getTime();
                return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
            })
            .slice(0, ACTIVITY_LIMIT);
    }, [projects]);

    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
    };

    if (isLoading) {
        return (
            <section className={activityShell}>
                <h2 className="text-lg font-semibold text-primary">{t("activity.title")}</h2>
                <div className="mt-8 flex min-h-24 items-center justify-center">
                    <LoadingIndicator type="line-simple" size="sm" label={t("table.loading")} />
                </div>
            </section>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <section className={activityShell}>
            <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-secondary p-2.5 text-fg-secondary ring-1 ring-secondary/80">
                    <Clock className="size-5" aria-hidden />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-primary">{t("activity.title")}</h2>
                    <p className="mt-1.5 text-sm text-tertiary">{t("activity.subtitle")}</p>
                </div>
            </div>
            <ul className="mt-6 divide-y divide-secondary/80 border-t border-secondary/80">
                {items.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <Link to={paths.project(p.id)} className="font-medium text-primary underline-offset-2 hover:underline">
                            {p.name}
                        </Link>
                        <time className="shrink-0 text-xs tabular-nums text-quaternary" dateTime={p.updatedAt}>
                            {formatDate(p.updatedAt)}
                        </time>
                    </li>
                ))}
            </ul>
        </section>
    );
}
