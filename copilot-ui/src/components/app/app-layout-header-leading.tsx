import { ChevronRight } from "@untitledui/icons";
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
    const workspaceProjectRouteMatch = useMatch("/workspace/:workspaceRole/projects/:projectId");
    const projectsRouteMatch = useMatch("/projects/:projectId");
    const projectRouteLegacyMatch = useMatch("/project/:projectId");
    const projectRouteMatch = workspaceProjectRouteMatch ?? projectsRouteMatch ?? projectRouteLegacyMatch;
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
        // Avoid duplicate detail calls on manager route while manager detail endpoint rollout is ongoing.
        enabled: Boolean(projectId && projectRouteMatch && !isManagerProjectRoute && (getApiAuthToken() || enterpriseId)),
        retry: false,
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
        <nav className="min-w-0 flex-1 pr-2 text-start md:pr-3" aria-label={t("common:layout.breadcrumbNav")}>
            <ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[13px] leading-tight">
                {segments.map((seg, i) => {
                    const isLast = i === segments.length - 1;
                    const content =
                        seg.to && !isLast ? (
                            <Link
                                to={seg.to}
                                className="rounded-md px-1 py-0.5 text-secondary underline-offset-2 transition hover:bg-secondary_subtle hover:text-primary hover:underline"
                            >
                                {seg.label}
                            </Link>
                        ) : (
                            <span
                                className={cx(
                                    "block max-w-[min(100%,12rem)] truncate px-0.5 py-0.5 sm:max-w-md",
                                    isLast ? "font-semibold text-primary" : "text-secondary",
                                )}
                                title={isLast ? seg.label : undefined}
                                aria-current={isLast ? "page" : undefined}
                            >
                                {seg.label}
                            </span>
                        );
                    return (
                        <li key={`${seg.label}-${i}`} className="flex max-w-full items-center gap-0.5">
                            {i > 0 ? (
                                <ChevronRight className="size-3.5 shrink-0 text-quaternary/80" aria-hidden />
                            ) : null}
                            {content}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
