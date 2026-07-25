import { useMemo, useRef } from "react";
import { Button } from "@/components/base/buttons/button";
import {
    getWhatIfErrorCode,
    getWhatIfErrorMessage,
    parseWhatIfValidationErrors,
} from "@/api/whatif.api";
import { EmptyBaselineState } from "@/components/projects/simulation/EmptyBaselineState";
import { SimulationFormBar } from "@/components/projects/simulation/SimulationFormBar";
import { SimulationResult } from "@/components/projects/simulation/SimulationResult";
import { useProjectViabilityRefresh } from "@/hooks/use-project-viability-refresh";
import { useSimulateWhatIf } from "@/hooks/useProjectWhatIf";
import { useTeam } from "@/hooks/useTeam";
import { isProjectFrozen } from "@/lib/project-budget-utils";
import type { WhatIfModifications } from "@/api/whatif.types";
import type { MissionControlAssignment, MissionControlRequirement } from "@/types/api.types";
import { useMissionControlT } from "../use-mission-control-i18n";

type MissionControlSimulationTabProps = {
    projectId: string;
    projectStatus: string;
    assignments: MissionControlAssignment[];
    requirements: MissionControlRequirement[];
};

export function MissionControlSimulationTab({
    projectId,
    projectStatus,
    assignments,
    requirements,
}: MissionControlSimulationTabProps) {
    const { mc } = useMissionControlT();
    const simulate = useSimulateWhatIf(projectId);
    const viabilityRefresh = useProjectViabilityRefresh();
    const teamQuery = useTeam({ scope: "enterprise", limit: 500 });
    const lastModsRef = useRef<WhatIfModifications | null>(null);

    const assignedTalentIds = useMemo(() => {
        const ids = new Set<string>();
        for (const a of assignments) {
            const id = a.talent_id?.trim();
            if (id) ids.add(id.toLowerCase());
        }
        return ids;
    }, [assignments]);

    const availableTalents = useMemo(() => {
        return (teamQuery.data?.talents ?? [])
            .filter((talent) => !assignedTalentIds.has(talent.id.trim().toLowerCase()))
            .map((talent) => ({
                id: talent.id,
                label: talent.full_name?.trim() || talent.id,
            }));
    }, [teamQuery.data?.talents, assignedTalentIds]);

    const availableSkills = useMemo(() => {
        const unique = new Map<string, string>();
        for (const req of requirements) {
            unique.set(req.skill_id, req.skill_name || req.skill_id);
        }
        return [...unique.entries()].map(([id, label]) => ({ id, label }));
    }, [requirements]);

    const isFrozen = isProjectFrozen(projectStatus);
    const errorCode = simulate.isError ? getWhatIfErrorCode(simulate.error) : undefined;
    const isBaselineMissing = errorCode === "baseline_missing";
    const fieldErrors =
        simulate.isError && errorCode === "validation_failed"
            ? parseWhatIfValidationErrors(simulate.error)
            : undefined;
    const bannerMessage =
        simulate.isError && errorCode !== "validation_failed" && errorCode !== "baseline_missing"
            ? getWhatIfErrorMessage(simulate.error)
            : null;

    const onRun = (mods: WhatIfModifications) => {
        lastModsRef.current = mods;
        simulate.mutate(mods);
    };

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                {mc("whatIfIntro")}{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">{mc("whatIfNoPersistenceShort")}</span>
            </p>

            {isBaselineMissing ? (
                <EmptyBaselineState
                    onLaunchAnalysis={() => viabilityRefresh.mutate({ projectId })}
                    isLaunching={viabilityRefresh.isPending}
                />
            ) : (
                <>
                    <SimulationFormBar
                        availableTalents={availableTalents}
                        availableSkills={availableSkills}
                        isLoading={simulate.isPending || teamQuery.isLoading}
                        isFrozen={isFrozen}
                        fieldErrors={fieldErrors}
                        onRun={onRun}
                    />

                    {bannerMessage ? (
                        <div
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                            role="alert"
                        >
                            <p className="min-w-0 flex-1">{bannerMessage}</p>
                            {errorCode === "observer_error" || errorCode === "orchestrator_error" ? (
                                <Button
                                    type="button"
                                    color="secondary"
                                    size="sm"
                                    isDisabled={simulate.isPending}
                                    onClick={() => {
                                        if (lastModsRef.current) simulate.mutate(lastModsRef.current);
                                    }}
                                >
                                    {mc("simulationRetry")}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}

                    {simulate.data ? (
                        <SimulationResult result={simulate.data} />
                    ) : (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                            {mc("simulationConfigureHint")}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
