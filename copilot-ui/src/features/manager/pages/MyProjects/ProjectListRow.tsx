import type { TFunction } from "i18next";
import { Link } from "react-router";
import { DotsVertical } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { AiRecommendationBadge } from "@/features/manager/components/AiRecommendationBadge";
import type { ProjectListItem, ProjectStatus } from "@/types/api.types";
import type { ManagerProjectNavState } from "@/utils/manager-project-navigation";
import { cx } from "@/utils/cx";

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function fragilityToneClass(score: number | null): string {
    if (score == null) return "border-l-transparent";
    if (score >= 5) return "border-l-4 border-l-red-500";
    if (score >= 3) return "border-l-4 border-l-amber-400";
    return "border-l-4 border-l-transparent";
}

function formatHorizonFromBackend(
    project: ProjectListItem,
    t: TFunction<"common", undefined>,
    dateLocale: string,
): { primary: string; secondary: string | null } {
    const days = coerceFiniteNumber(project.days_to_milestone);
    if (days != null) {
        if (days < 0) {
            return {
                primary: t("managerWorkspace.projects.horizonOverdue", { count: Math.abs(days) }),
                secondary: null,
            };
        }
        if (days === 0) {
            return { primary: t("managerWorkspace.projects.horizonToday"), secondary: null };
        }
        return { primary: t("managerWorkspace.projects.horizonJMinus", { days }), secondary: null };
    }

    const raw = project.milestone_at;
    if (raw != null && String(raw).trim() !== "") {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
            return { primary: d.toLocaleDateString(dateLocale), secondary: null };
        }
    }

    return { primary: "—", secondary: null };
}

export function ProjectListRow({
    project,
    rowPadding,
    displayName,
    statusLabel,
    horizon,
    t,
    onOpenProject,
    projectDetailPath,
    buildProjectNavState,
    onEditRequest,
    onDeleteRequest,
    onRunAnalysis,
    isAnalysisPending,
}: {
    project: ProjectListItem;
    rowPadding: string;
    displayName: string;
    statusLabel: (status: ProjectStatus) => string;
    horizon: { primary: string; secondary: string | null };
    t: TFunction<"common", undefined>;
    onOpenProject: (project: ProjectListItem) => void;
    projectDetailPath: (projectId: string) => string;
    buildProjectNavState: (project: ProjectListItem) => ManagerProjectNavState;
    onEditRequest?: (project: ProjectListItem) => void;
    onDeleteRequest?: (project: { id: string; name: string }) => void;
    onRunAnalysis?: (projectId: string) => void;
    isAnalysisPending?: boolean;
}) {
    const fragility = coerceFiniteNumber(project.fragility_score);
    const progress = coerceFiniteNumber(project.progress_pct);
    const teamSize = Math.round(coerceFiniteNumber(project.team_size) ?? 0);
    const priority = Math.round(coerceFiniteNumber(project.priority) ?? 0);
    const arbitragesPending = coerceFiniteNumber(project.ai_recommendation?.arbitrages_pending) ?? 0;

    return (
        <tr
            onClick={() => onOpenProject(project)}
            className={cx(
                "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60",
                fragilityToneClass(fragility),
            )}
        >
            <td className={cx("max-w-[280px] px-3 align-middle", rowPadding)}>
                <Link
                    to={projectDetailPath(project.id)}
                    state={buildProjectNavState(project)}
                    onClick={(event) => event.stopPropagation()}
                    className="line-clamp-2 font-semibold leading-snug text-slate-900 hover:text-violet-700 hover:underline dark:text-slate-100 dark:hover:text-violet-300"
                >
                    {displayName}
                </Link>
                <p className="mt-0.5 text-[11px] text-slate-500">
                    {statusLabel(project.status)} · P{priority}
                    {teamSize > 0 ? ` · 👥 ${teamSize}` : null}
                </p>
            </td>
            <td className={cx("px-2 align-middle tabular-nums", rowPadding)}>
                {fragility != null ? (
                    <span
                        className={cx(
                            "text-sm font-semibold",
                            fragility >= 5
                                ? "text-red-700 dark:text-red-300"
                                : fragility >= 3
                                  ? "text-amber-800 dark:text-amber-300"
                                  : "text-emerald-700 dark:text-emerald-300",
                        )}
                    >
                        {fragility.toFixed(1)}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </td>
            <td className={cx("max-w-xs px-2 align-middle", rowPadding)} onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                        <AiRecommendationBadge recommendation={project.ai_recommendation} size="md" showAction />
                        {project.ai_recommendation?.decision == null && onRunAnalysis ? (
                            <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                                <Button
                                    type="button"
                                    color="link-color"
                                    size="sm"
                                    className="h-auto min-h-0 px-0 py-0 text-[11px]"
                                    isDisabled={isAnalysisPending}
                                    onClick={() => onRunAnalysis(project.id)}
                                >
                                    {t("managerWorkspace.projects.aiRunAnalysis")}
                                </Button>
                            </span>
                        ) : null}
                    </div>
                    {arbitragesPending > 0 ? (
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                            {t("managerWorkspace.projects.aiArbitragesPending", { count: arbitragesPending })}
                        </span>
                    ) : null}
                </div>
            </td>
            <td className={cx("whitespace-nowrap px-2 align-middle", rowPadding)}>
                <span className="font-medium text-slate-700 dark:text-slate-200">{horizon.primary}</span>
                {horizon.secondary ? <p className="mt-0.5 text-[11px] text-slate-500">{horizon.secondary}</p> : null}
            </td>
            <td className={cx("px-2 align-middle", rowPadding)}>
                {progress != null ? (
                    <div className="flex min-w-[96px] items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div
                                className="h-full rounded-full bg-violet-600"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                        </div>
                        <span className="w-9 text-right text-[11px] tabular-nums text-slate-600">{Math.round(progress)}%</span>
                    </div>
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </td>
            <td
                className={cx("pr-3 text-right align-middle", rowPadding)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <Dropdown.Root>
                    <Button
                        type="button"
                        color="tertiary"
                        size="sm"
                        className="min-h-8 min-w-8"
                        iconLeading={DotsVertical}
                        aria-label={t("managerWorkspace.missionControl.moreActions")}
                        aria-haspopup="menu"
                    />
                    <Dropdown.Popover className="min-w-[12rem]">
                        <Dropdown.Menu
                            onAction={(key) => {
                                const k = String(key);
                                if (k === "view") onOpenProject(project);
                                if (k === "edit") onEditRequest?.(project);
                                if (k === "analyze") onRunAnalysis?.(project.id);
                                if (k === "delete") {
                                    onDeleteRequest?.({ id: project.id, name: displayName });
                                }
                            }}
                        >
                            <Dropdown.Item id="view" label={t("managerWorkspace.projects.viewDetails")} />
                            <Dropdown.Item id="edit" label={t("managerWorkspace.projects.menuEdit")} />
                            <Dropdown.Item
                                id="analyze"
                                label={t("managerWorkspace.missionControl.runAnalysis")}
                                isDisabled={isAnalysisPending}
                            />
                            <Dropdown.Separator />
                            <Dropdown.Item id="delete" label={t("managerWorkspace.projects.menuDelete")} />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </td>
        </tr>
    );
}

export { coerceFiniteNumber, formatHorizonFromBackend, fragilityToneClass };
