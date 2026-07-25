import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import {
    getWhatIfErrorCode,
    getWhatIfErrorMessage,
    parseWhatIfValidationErrors,
} from "@/api/whatif.api";
import { EmptyBaselineState } from "@/components/projects/simulation/EmptyBaselineState";
import { SimulationFormBar } from "@/components/projects/simulation/SimulationFormBar";
import { SimulationResult } from "@/components/projects/simulation/SimulationResult";
import { useProjectRequirementsQuery } from "@/hooks/use-manager-project-requirements";
import { useProjectViabilityRefresh } from "@/hooks/use-project-viability-refresh";
import { useSimulateWhatIf } from "@/hooks/useProjectWhatIf";
import { useTeam } from "@/hooks/useTeam";
import { isProjectFrozen } from "@/lib/project-budget-utils";
import type { WhatIfModifications } from "@/api/whatif.types";
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
    const fieldErrors =
        simulate.isError && errorCode === "validation_failed"
            ? parseWhatIfValidationErrors(simulate.error)
            : undefined;
    const bannerMessage =
        simulate.isError && errorCode !== "validation_failed" && errorCode !== "baseline_missing"
            ? getWhatIfErrorMessage(simulate.error)
            : null;

    const lastModsRef = useRef<WhatIfModifications | null>(null);

    const onRun = (mods: WhatIfModifications) => {
        lastModsRef.current = mods;
        simulate.mutate(mods);
    };

    const onRetry = () => {
        if (lastModsRef.current) simulate.mutate(lastModsRef.current);
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <header>
                <h2 className="text-xl font-bold text-fg-primary">{tm("whatIfTitle")}</h2>
                <p className="mt-1 text-sm text-fg-tertiary">
                    {tm("whatIfIntro")}{" "}
                    <strong className="font-semibold text-fg-secondary">{tm("whatIfNoPersistenceShort")}</strong>
                </p>
            </header>

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
                        isLoading={simulate.isPending || teamQuery.isLoading || requirementsQuery.isLoading}
                        isFrozen={isFrozen}
                        fieldErrors={fieldErrors}
                        onRun={onRun}
                    />

                    {bannerMessage ? (
                        <div
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
                            role="alert"
                        >
                            <p className="min-w-0 flex-1">{bannerMessage}</p>
                            {errorCode === "observer_error" || errorCode === "orchestrator_error" ? (
                                <Button type="button" color="secondary" size="sm" onClick={onRetry} isDisabled={simulate.isPending}>
                                    {tm("simulationRetry")}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}

                    {simulate.data ? (
                        <SimulationResult result={simulate.data} />
                    ) : (
                        <p className="rounded-xl border border-dashed border-secondary bg-primary/50 p-8 text-center text-sm text-fg-tertiary">
                            {tm("simulationConfigureHint")}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
