import { useState } from "react";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Label } from "@/components/base/input/label";
import { NativeSelect } from "@/components/base/select/select-native";
import type { WhatIfFieldErrors, WhatIfModifications } from "@/api/whatif.types";
import type { SimulationOption } from "./SimulationForm";
import { cx } from "@/utils/cx";

type SimulationFormBarProps = {
    availableTalents: SimulationOption[];
    availableSkills: SimulationOption[];
    isLoading: boolean;
    isFrozen?: boolean;
    initialTalentId?: string;
    initialAllocPct?: number;
    fieldErrors?: WhatIfFieldErrors;
    onRun: (mods: WhatIfModifications) => void;
};

export function SimulationFormBar({
    availableTalents,
    availableSkills,
    isLoading,
    isFrozen = false,
    initialTalentId = "",
    initialAllocPct = 0,
    fieldErrors,
    onRun,
}: SimulationFormBarProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const [allocPct, setAllocPct] = useState(initialAllocPct);
    const [talentId, setTalentId] = useState(initialTalentId);
    const [skillId, setSkillId] = useState("");

    const hasAnyMod = allocPct !== 0 || Boolean(talentId) || Boolean(skillId);
    const disabled = !hasAnyMod || isLoading || isFrozen;

    const submit = () =>
        onRun({
            allocation_pct: allocPct,
            added_talent_id: talentId || null,
            training_skill_id: skillId || null,
        });

    return (
        <section
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            style={{ maxHeight: 180 }}
            aria-labelledby="simulation-form-bar-title"
        >
            <h2 id="simulation-form-bar-title" className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {tm("whatIfParamsTitle")}
            </h2>
            <div
                className={cx(
                    "grid items-end gap-3",
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]",
                )}
            >
                <div>
                    <Label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{tm("whatIfAllocLabel")}</Label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step={5}
                            value={allocPct}
                            disabled={isFrozen}
                            onChange={(e) => setAllocPct(Number(e.target.value))}
                            className={cx(
                                "w-full rounded-lg border px-2.5 py-1.5 text-sm tabular-nums dark:bg-slate-800",
                                fieldErrors?.allocation_pct
                                    ? "border-rose-400 dark:border-rose-500"
                                    : "border-slate-200 dark:border-slate-600",
                            )}
                            aria-label={tm("whatIfAllocLabel")}
                            aria-invalid={Boolean(fieldErrors?.allocation_pct)}
                        />
                        <span className="shrink-0 text-xs text-slate-500">%</span>
                    </div>
                    {fieldErrors?.allocation_pct ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.allocation_pct}</p>
                    ) : null}
                </div>

                <div>
                    <Label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{tm("whatIfAddTalent")}</Label>
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
                    {fieldErrors?.added_talent_id ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.added_talent_id}</p>
                    ) : null}
                </div>

                <div>
                    <Label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{tm("whatIfTrainingSkill")}</Label>
                    <NativeSelect
                        aria-label={tm("whatIfTrainingSkill")}
                        value={skillId}
                        onChange={(e) => setSkillId(e.target.value)}
                        disabled={isFrozen}
                        options={[
                            { label: tm("whatIfNoneSkillOption"), value: "" },
                            ...availableSkills.map((skill) => ({ label: skill.label, value: skill.id })),
                        ]}
                    />
                    {fieldErrors?.training_skill_id ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.training_skill_id}</p>
                    ) : null}
                </div>

                <Button
                    type="button"
                    color="primary"
                    size="md"
                    className="w-full shrink-0 sm:w-auto"
                    iconLeading={Play}
                    isLoading={isLoading}
                    isDisabled={disabled}
                    onClick={submit}
                >
                    {isLoading ? tm("simulateRunning") : tm("runSimulation")}
                </Button>
            </div>
            {fieldErrors?._form ? (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{fieldErrors._form}</p>
            ) : null}
        </section>
    );
}
