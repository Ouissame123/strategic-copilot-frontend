import { useState } from "react";
import { GraduationCap, Play, Sliders, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Label } from "@/components/base/input/label";
import { NativeSelect } from "@/components/base/select/select-native";
import { Slider } from "@/components/base/slider/slider";
import type { WhatIfModifications } from "@/api/whatif.types";

export type SimulationOption = { id: string; label: string };

type SimulationFormProps = {
    availableTalents: SimulationOption[];
    availableSkills: SimulationOption[];
    isLoading: boolean;
    isFrozen?: boolean;
    onRun: (mods: WhatIfModifications) => void;
};

export function SimulationForm({
    availableTalents,
    availableSkills,
    isLoading,
    isFrozen = false,
    onRun,
}: SimulationFormProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const [allocPct, setAllocPct] = useState(0);
    const [talentId, setTalentId] = useState("");
    const [skillId, setSkillId] = useState("");

    const hasAnyMod = allocPct > 0 || Boolean(talentId) || Boolean(skillId);
    const disabled = !hasAnyMod || isLoading || isFrozen;

    return (
        <section className="rounded-xl border border-secondary bg-primary p-5 shadow-sm" aria-labelledby="simulation-form-title">
            <header className="mb-5">
                <h2 id="simulation-form-title" className="flex items-center gap-2 text-base font-semibold text-fg-primary">
                    <Sliders className="size-5" aria-hidden />
                    {tm("whatIfParamsTitle")}
                </h2>
                <p className="mt-1 text-xs text-fg-tertiary">
                    {tm("whatIfNoPersistence")}
                </p>
            </header>

            <p className="mb-5 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100">
                {tm("whatIfHelpBanner")}
            </p>

            <div className="space-y-6">
                <div>
                    <Label className="mb-2 flex items-center justify-between">
                        <span>{tm("whatIfAllocLabel")}</span>
                        <span className="font-mono text-sm tabular-nums text-fg-secondary">{allocPct}%</span>
                    </Label>
                    <Slider
                        aria-label={tm("whatIfAllocLabel")}
                        value={allocPct}
                        onChange={setAllocPct}
                        minValue={0}
                        maxValue={200}
                        step={5}
                        isDisabled={isFrozen}
                        formatOptions={{ style: "decimal", maximumFractionDigits: 0 }}
                        labelFormatter={(v) => `${v}%`}
                    />
                    <div className="mt-1 flex justify-between text-xs text-fg-quaternary">
                        <span>0%</span>
                        <span>100%</span>
                        <span>200%</span>
                    </div>
                </div>

                <div>
                    <Label className="mb-2 flex items-center gap-1">
                        <UserPlus className="size-4" aria-hidden />
                        {tm("whatIfAddTalent")}
                    </Label>
                    <NativeSelect
                        aria-label={tm("whatIfAddTalent")}
                        value={talentId}
                        onChange={(e) => setTalentId(e.target.value)}
                        disabled={isFrozen}
                        options={[
                            { label: tm("whatIfNoneOption"), value: "" },
                            ...availableTalents.map((talent) => ({ label: talent.label, value: talent.id })),
                        ]}
                    />
                </div>

                <div>
                    <Label className="mb-2 flex items-center gap-1">
                        <GraduationCap className="size-4" aria-hidden />
                        {tm("whatIfTrainingSkill")}
                    </Label>
                    <NativeSelect
                        aria-label={tm("whatIfTrainingSkill")}
                        value={skillId}
                        onChange={(e) => setSkillId(e.target.value)}
                        disabled={isFrozen}
                        options={[
                            { label: tm("whatIfNoneOption"), value: "" },
                            ...availableSkills.map((skill) => ({ label: skill.label, value: skill.id })),
                        ]}
                    />
                </div>

                <Button
                    type="button"
                    color="primary"
                    size="md"
                    className="w-full"
                    iconLeading={Play}
                    isLoading={isLoading}
                    isDisabled={disabled}
                    aria-label={isLoading ? tm("simulateRunning") : tm("runSimulation")}
                    onClick={() =>
                        onRun({
                            allocation_pct: allocPct,
                            added_talent_id: talentId || null,
                            training_skill_id: skillId || null,
                        })
                    }
                >
                    {isLoading ? tm("simulateRunning") : tm("runSimulation")}
                </Button>
            </div>
        </section>
    );
}

// Garde-fou CI : allocation_pct borné [0..200] côté UI
export const SIMULATION_ALLOC_MAX = 200;
