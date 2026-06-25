import { useMemo } from "react";
import { Beaker } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getWhatIfErrorCode } from "@/api/whatif.api";
import { EmptyBaselineState } from "@/components/projects/simulation/EmptyBaselineState";
import { SimulationForm } from "@/components/projects/simulation/SimulationForm";
import { SimulationResult } from "@/components/projects/simulation/SimulationResult";
import { useProjectRequirementsQuery } from "@/hooks/use-manager-project-requirements";
import { useProjectViabilityRefresh } from "@/hooks/use-project-viability-refresh";
import { useSimulateWhatIf } from "@/hooks/useProjectWhatIf";
import { useTeam } from "@/hooks/useTeam";
import { isProjectFrozen } from "@/lib/project-budget-utils";
import type { ProjectDetailResponse } from "@/types/api.types";

type SimulationTabProps = {
    projectId: string;
    projectStatus?: string | null;
    detail?: ProjectDetailResponse;
};

export function SimulationTab({ projectId, projectStatus, detail }: SimulationTabProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const simulate = useSimulateWhatIf(projectId);
    const viabilityRefresh = useProjectViabilityRefresh();
    const teamQuery = useTeam({ scope: "enterprise", limit: 500 });
    const requirementsQuery = useProjectRequirementsQuery(projectId);

    const assignedTalentIds = useMemo(() => {
        const ids = new Set<string>();
        for (const a of detail?.assignments ?? []) {
            const id = a.talent_id?.trim();
            if (id) ids.add(id.toLowerCase());
        }
        return ids;
    }, [detail?.assignments]);

    const availableTalents = useMemo(() => {
        return (teamQuery.data?.talents ?? [])
            .filter((talent) => !assignedTalentIds.has(talent.id.trim().toLowerCase()))
            .map((talent) => ({
                id: talent.id,
                label: talent.full_name?.trim() || talent.name?.trim() || talent.id,
            }));
    }, [teamQuery.data?.talents, assignedTalentIds]);

    const availableSkills = useMemo(() => {
        const unique = new Map<string, string>();
        for (const req of requirementsQuery.data?.requirements ?? []) {
            unique.set(req.skill_id, req.skill_name || req.skill_id);
        }
        return [...unique.entries()].map(([id, label]) => ({ id, label }));
    }, [requirementsQuery.data?.requirements]);

    const isFrozen = isProjectFrozen(projectStatus ?? detail?.project.status);
    const errorCode = simulate.isError ? getWhatIfErrorCode(simulate.error) : undefined;
    const isBaselineMissing = errorCode === "baseline_missing";

    const handleLaunchAnalysis = () => {
        viabilityRefresh.mutate({ projectId });
    };

    return (
        <div className="space-y-6">
            <header className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-950/50">
                    <Beaker className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-fg-primary">{tm("whatIfTitle")}</h2>
                    <p className="mt-1 text-sm text-fg-tertiary">
                        {tm("whatIfIntro")} <strong className="font-semibold text-fg-secondary">{tm("whatIfNoPersistenceShort")}</strong>
                    </p>
                </div>
            </header>

            {isBaselineMissing ? (
                <EmptyBaselineState onLaunchAnalysis={handleLaunchAnalysis} isLaunching={viabilityRefresh.isPending} />
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <SimulationForm
                        availableTalents={availableTalents}
                        availableSkills={availableSkills}
                        isLoading={simulate.isPending || teamQuery.isLoading || requirementsQuery.isLoading}
                        isFrozen={isFrozen}
                        onRun={(mods) => simulate.mutate(mods)}
                    />

                    <div>
                        {simulate.data ? (
                            <SimulationResult result={simulate.data} />
                        ) : (
                            <p className="rounded-xl border border-dashed border-secondary bg-primary/50 p-8 text-center text-sm text-fg-tertiary">
                                {tm("simulationConfigureHint")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
