import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AiRecommendationBadge } from "@/features/manager/components/AiRecommendationBadge";
import { useManagerTopRecommendations } from "@/hooks/use-manager-top-recommendations";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

export function TopRecommendationsWidget() {
    const { t } = useTranslation("common");
    const query = useManagerTopRecommendations();
    const recommendations = (query.data?.recommendations ?? []).slice(0, 5);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("managerWorkspace.projects.aiRecommendation.topWidgetTitle")}
            </h2>

            {query.isLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
                    {t("managerWorkspace.aiRecommendation.loading")}
                </div>
            ) : null}

            {query.isError ? (
                <p className="mt-4 text-sm text-red-600">{t("managerWorkspace.aiRecommendation.loadError")}</p>
            ) : null}

            {!query.isLoading && !query.isError && recommendations.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{t("managerWorkspace.aiRecommendation.topWidgetEmpty")}</p>
            ) : null}

            {!query.isLoading && !query.isError && recommendations.length > 0 ? (
                <ul className="mt-4 space-y-3">
                    {recommendations.map((item) => (
                        <li
                            key={item.project_id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                        >
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {item.project_name ?? item.project_id}
                                </p>
                                <AiRecommendationBadge recommendation={item.ai_recommendation} size="sm" />
                            </div>
                            <Link
                                to={managerProjectsOpenModalPath(item.project_id)}
                                className="shrink-0 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                            >
                                {t("managerWorkspace.aiRecommendation.viewProject")}
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}
        </article>
    );
}
