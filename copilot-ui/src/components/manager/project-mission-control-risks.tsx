import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectRiskItem } from "@/types/api.types";
import {
    formatProjectRiskScore,
    projectRiskSeverityBadgeClass,
    projectRiskTitle,
    sortProjectRisksBySeverity,
} from "@/lib/project-risks-display";
import { cx } from "@/utils/cx";

export type ProjectMissionControlRisksProps = {
    risks: ProjectRiskItem[];
};

export function ProjectMissionControlRisks({ risks }: ProjectMissionControlRisksProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const sortedRisks = useMemo(() => sortProjectRisksBySeverity(risks), [risks]);

    return (
        <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm sm:p-5">
            <h4 className="mb-3 text-base font-semibold text-fg-primary">{tm("risksTabTitle")}</h4>

            {sortedRisks.length === 0 ? <p className="text-sm text-fg-tertiary">{tm("risksEmpty")}</p> : null}

            <div className="space-y-3">
                {sortedRisks.map((risk) => {
                    const severityLabel = (risk.severity ?? "—").toUpperCase();
                    const scoreLabel = formatProjectRiskScore(risk.score);
                    const description = risk.description?.trim() || tm("riskNoDescription");

                    return (
                        <article
                            key={risk.id}
                            className="rounded-lg border border-secondary bg-primary px-3 py-2.5 shadow-xs sm:px-4 sm:py-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <span
                                        className={cx(
                                            "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                            projectRiskSeverityBadgeClass(risk.severity),
                                        )}
                                    >
                                        {severityLabel}
                                    </span>
                                    <h5 className="text-sm font-semibold leading-snug text-fg-primary sm:text-base">
                                        {projectRiskTitle(risk)}
                                    </h5>
                                </div>
                                {scoreLabel ? (
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-fg-secondary sm:text-base">
                                        {scoreLabel}
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-fg-tertiary">{description}</p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
