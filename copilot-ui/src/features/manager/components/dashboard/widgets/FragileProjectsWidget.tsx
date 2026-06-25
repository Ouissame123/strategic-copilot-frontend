import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { FragileProjectWidget } from "@/features/manager/types/dashboard";
import { DASHBOARD_CARD_CLASS, decisionLabelFr, decisionStyle, formatDisplayValue } from "@/features/manager/lib/dashboard-display";
import { SectionTitleWithCodename } from "../SectionTitleWithCodename";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { cx } from "@/utils/cx";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";

export function FragileProjectsWidget({ projects }: { projects: FragileProjectWidget[] }) {
    const navigate = useNavigate();
    const { t } = useTranslation("common");
    const topFive = projects.slice(0, 5);

    return (
        <article className={DASHBOARD_CARD_CLASS}>
            <SectionTitleWithCodename
                title={t("managerWorkspace.dashboard.fragileSectionTitle")}
                codename="Observer"
                className="mb-3"
                titleClassName="text-sm"
            />
            {topFive.length === 0 ? (
                <p className="text-sm text-tertiary">Aucun projet fragile signalé.</p>
            ) : (
                <div className="space-y-1.5">
                    {topFive.map((project) => {
                        const decision = project.decision ?? "";
                        const style = decisionStyle(decision);
                        return (
                            <button
                                key={project.id}
                                type="button"
                                onClick={() => navigate(managerProjectMissionControlPath(project.id))}
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-secondary px-3 py-2 text-left transition hover:bg-secondary_subtle"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-primary">{project.name}</p>
                                    <p className="mt-0.5 text-xs text-tertiary">
                                        Viabilité {formatDisplayValue(project.viability_score)}/10 · {project.alerts_count ?? 0}{" "}
                                        alertes
                                        {(project.team_size ?? 0) > 0 ? ` · ${project.team_size} membres` : ""}
                                    </p>
                                </div>
                                {decision ? (
                                    <span
                                        className={cx(
                                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                            style.bg,
                                            style.text,
                                            style.border,
                                        )}
                                    >
                                        {decisionLabelFr(decision)}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            )}
        </article>
    );
}
