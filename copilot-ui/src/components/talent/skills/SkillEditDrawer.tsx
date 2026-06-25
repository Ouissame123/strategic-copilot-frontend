import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Slider } from "@/components/base/slider/slider";
import { Toggle } from "@/components/base/toggle/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteSkill, useUpdateSkill } from "@/hooks/useTalentSkills";
import type { MySkill, UpdateSkillPayload } from "@/types/talent-skills";
import { LEVEL_TONES, badgeToneClass } from "./talent-skills-ui";

type SkillEditDrawerProps = {
    open: boolean;
    skill: MySkill | null;
    onClose: () => void;
};

export function SkillEditDrawer({ open, skill, onClose }: SkillEditDrawerProps) {
    const [level, setLevel] = useState(0);
    const [yearsExperience, setYearsExperience] = useState("");
    const [isCertified, setIsCertified] = useState(false);
    const [lastUsedAt, setLastUsedAt] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const updateMutation = useUpdateSkill();
    const deleteMutation = useDeleteSkill();

    useEffect(() => {
        if (!open || !skill) return;
        setLevel(skill.level);
        setYearsExperience(skill.years_experience != null ? String(skill.years_experience) : "");
        setIsCertified(skill.is_certified);
        setLastUsedAt(skill.last_used_at?.slice(0, 10) ?? "");
        setConfirmDelete(false);
    }, [open, skill]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || !skill) return null;

    const levelTone = LEVEL_TONES[skill.level_label] ?? "slate";

    const handleSave = () => {
        const payload: UpdateSkillPayload = {
            level,
            is_certified: isCertified,
        };
        const years = yearsExperience.trim();
        payload.years_experience = years ? Number(years) : undefined;
        payload.last_used_at = lastUsedAt.trim() || undefined;

        updateMutation.mutate(
            { skillId: skill.skill_id, payload },
            {
                onSuccess: () => onClose(),
            },
        );
    };

    const handleDelete = () => {
        deleteMutation.mutate(skill.skill_id, {
            onSuccess: () => {
                setConfirmDelete(false);
                onClose();
            },
        });
    };

    return (
        <>
            <button type="button" className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]" aria-label="Fermer" onClick={onClose} />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="skill-edit-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0">
                        <span className={badgeToneClass(levelTone)}>{skill.level_label}</span>
                        <h2 id="skill-edit-drawer-title" className="mt-2 text-base font-semibold text-primary">
                            {skill.skill_name}
                        </h2>
                        {skill.category ? <p className="text-xs text-tertiary">{skill.category}</p> : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-primary">Niveau ({level}/10)</label>
                            <Slider
                                minValue={0}
                                maxValue={10}
                                step={1}
                                value={level}
                                onChange={(v) => setLevel(Number(v))}
                                isDisabled={updateMutation.isPending}
                                labelFormatter={(v) => `${v}/10`}
                            />
                        </div>

                        <div>
                            <label htmlFor="edit-skill-years" className="mb-1.5 block text-sm font-medium text-primary">
                                Années d&apos;expérience
                            </label>
                            <input
                                id="edit-skill-years"
                                type="number"
                                min={0}
                                step={0.5}
                                value={yearsExperience}
                                onChange={(e) => setYearsExperience(e.target.value)}
                                disabled={updateMutation.isPending}
                                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                            />
                        </div>

                        <Toggle isSelected={isCertified} onChange={setIsCertified} isDisabled={updateMutation.isPending}>
                            Certifié
                        </Toggle>

                        <div>
                            <label htmlFor="edit-skill-last-used" className="mb-1.5 block text-sm font-medium text-primary">
                                Dernière utilisation
                            </label>
                            <input
                                id="edit-skill-last-used"
                                type="date"
                                value={lastUsedAt}
                                onChange={(e) => setLastUsedAt(e.target.value)}
                                disabled={updateMutation.isPending}
                                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <footer className="shrink-0 border-t border-secondary px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button type="button" color="primary-destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                            Supprimer
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" color="secondary" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button type="button" color="primary" onClick={handleSave} isLoading={updateMutation.isPending}>
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </footer>
            </aside>

            <ConfirmDialog
                isOpen={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Supprimer cette compétence ?"
                body="Cette action est irréversible."
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                tone="danger"
                isConfirmLoading={deleteMutation.isPending}
                onConfirm={handleDelete}
            />
        </>
    );
}
