import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useMatch, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { getProjectById } from "@/api/project-by-id.api";
import { queryKeys } from "@/lib/query-keys";
import { resolveBreadcrumbs } from "@/layouts/app-layout-breadcrumbs";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";
import { getApiAuthToken, getHttpTimeoutMs } from "@/utils/apiClient";

export function AppLayoutHeaderLeading() {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const { t } = useTranslation(["common", "nav", "dataCrud"]);
    const { projectId } = useParams();
    const projectRouteMatch =
        useMatch("/workspace/:workspaceRole/projects/:projectId") ??
        useMatch("/projects/:projectId") ??
        useMatch("/project/:projectId");
    const isManagerProjectRoute = Boolean(useMatch("/workspace/manager/projects/:projectId"));
    const queryClient = useQueryClient();
    const detailKey = queryKeys.projects.detail(projectId ?? "");

    const enterpriseId = (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();

    const { data: projectDetail } = useQuery({
        queryKey: detailKey,
        queryFn: ({ signal }) =>
            getProjectById(projectId!, isManagerProjectRoute ? undefined : enterpriseId || undefined, {
                signal,
                timeout: getHttpTimeoutMs(),
            }),
        enabled: Boolean(projectId && projectRouteMatch && (getApiAuthToken() || enterpriseId)),
        staleTime: 60_000,
        placeholderData: () => (projectId ? queryClient.getQueryData(detailKey) : undefined),
    });

    const projectDetailLabel = (() => {
        if (!projectDetail || typeof projectDetail !== "object") return "";
        const root = projectDetail as Record<string, unknown>;
        const nested = root.project && typeof root.project === "object" ? (root.project as Record<string, unknown>) : null;
        const name = nested?.name ?? root.name;
        return typeof name === "string" ? name.trim() : "";
    })();

    const segments = resolveBreadcrumbs(pathname, t, {
        projectDetailLabel: projectDetailLabel || undefined,
    });

    return (
        <nav className="min-w-0 flex-1 pr-2 text-start md:pr-4" aria-label={t("common:layout.breadcrumbNav")}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                {segments.map((seg, i) => {
                    const isLast = i === segments.length - 1;
                    const content =
                        seg.to && !isLast ? (
                            <Link to={seg.to} className="text-secondary underline-offset-4 hover:text-primary hover:underline">
                                {seg.label}
                            </Link>
                        ) : (
                            <span
                                className={cx(isLast ? "max-w-[min(100%,12rem)] truncate font-medium text-primary sm:max-w-md" : "text-secondary")}
                                title={isLast ? seg.label : undefined}
                                aria-current={isLast ? "page" : undefined}
                            >
                                {seg.label}
                            </span>
                        );
                    return (
                        <li key={`${seg.label}-${i}`} className="flex items-center gap-1.5">
                            {i > 0 && (
                                <span className="text-quaternary select-none" aria-hidden>
                                    /
                                </span>
                            )}
                            {content}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
