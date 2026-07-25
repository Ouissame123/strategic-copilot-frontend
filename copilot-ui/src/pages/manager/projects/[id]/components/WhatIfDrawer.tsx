import { useMemo } from "react";
import { X } from "lucide-react";
import type { WhatIfModifications } from "@/api/whatif.types";
import {
    getWhatIfErrorCode,
    getWhatIfErrorMessage,
    parseWhatIfValidationErrors,
} from "@/api/whatif.api";
import type { SimulationOption } from "@/components/projects/simulation/SimulationForm";
import { SimulationFormBar } from "@/components/projects/simulation/SimulationFormBar";
import { SimulationResult } from "@/components/projects/simulation/SimulationResult";
import { useSimulateWhatIf } from "@/hooks/useProjectWhatIf";
import { useTeam } from "@/hooks/useTeam";
import { useMissionControlT } from "../use-mission-control-i18n";

export type WhatIfDialogPreset = {
    added_talent_id?: string;
    talent_name?: string;
    allocation_pct?: number;
};

type WhatIfDrawerProps = {
    projectId: string;
    assignedTalentIds: string[];
    requirements: SimulationOption[];
    preset?: WhatIfDialogPreset | null;
    onClose: () => void;
    /** @deprecated Plus d’affectation depuis la simulation — conservé pour compat appelants. */
    onAssigned?: () => void;
};

export function WhatIfDrawer({
    projectId,
    assignedTalentIds,
    requirements,
    preset,
    onClose,
}: WhatIfDrawerProps) {
    const { mc } = useMissionControlT();
    const simulate = useSimulateWhatIf(projectId);
    const teamQuery = useTeam({ scope: "enterprise", limit: 500 });

    const availableTalents = useMemo(() => {
        const assigned = new Set(assignedTalentIds.map((id) => id.trim().toLowerCase()));
        return (teamQuery.data?.talents ?? [])
            .filter((t) => !assigned.has(t.id.trim().toLowerCase()))
            .map((t) => ({ id: t.id, label: t.full_name?.trim() || t.id }));
    }, [teamQuery.data?.talents, assignedTalentIds]);

    const handleRun = (mods: WhatIfModifications) => {
        simulate.mutate(mods);
    };

    const errorCode = simulate.isError ? getWhatIfErrorCode(simulate.error) : undefined;
    const fieldErrors =
        simulate.isError && errorCode === "validation_failed"
            ? parseWhatIfValidationErrors(simulate.error)
            : undefined;
    const bannerMessage =
        simulate.isError && errorCode !== "validation_failed"
            ? getWhatIfErrorMessage(simulate.error)
            : null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
            <button type="button" className="absolute inset-0 bg-black/45" aria-label={mc("actions.close")} onClick={onClose} />
            <div
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
                aria-labelledby="what-if-dialog-title"
            >
                <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div>
                        <h2 id="what-if-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
                            {mc("whatIf.title")}
                        </h2>
                        <p className="text-xs text-slate-500">{mc("whatIfNoPersistenceShort")}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={mc("actions.close")}
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {preset?.talent_name ? (
                        <p className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100">
                            {mc("whatIfPresetTalent", { name: preset.talent_name })}
                        </p>
                    ) : null}
                    <SimulationFormBar
                        key={`${preset?.added_talent_id ?? ""}-${preset?.allocation_pct ?? ""}`}
                        availableTalents={availableTalents}
                        availableSkills={requirements}
                        isLoading={simulate.isPending || teamQuery.isLoading}
                        isFrozen={false}
                        initialTalentId={preset?.added_talent_id}
                        initialAllocPct={preset?.allocation_pct}
                        fieldErrors={fieldErrors}
                        onRun={handleRun}
                    />

                    {bannerMessage ? (
                        <div
                            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                            role="alert"
                        >
                            {bannerMessage}
                        </div>
                    ) : null}

                    {simulate.data ? (
                        <SimulationResult result={simulate.data} />
                    ) : (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
                            {mc("simulationConfigureHint")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
