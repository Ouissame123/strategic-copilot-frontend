import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Slider } from "@/components/base/slider/slider";
import { Toggle } from "@/components/base/toggle/toggle";
import type { CatalogSkill } from "@/types/talent-skills";
import type { CreateSkillPayload } from "@/types/talent-skills";

type AddSkillModalProps = {
    isOpen: boolean;
    skill: CatalogSkill | null;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateSkillPayload) => void;
};

export function AddSkillModal({ isOpen, skill, isSubmitting, onOpenChange, onSubmit }: AddSkillModalProps) {
    const [level, setLevel] = useState(5);
    const [yearsExperience, setYearsExperience] = useState("");
    const [isCertified, setIsCertified] = useState(false);
    const [lastUsedAt, setLastUsedAt] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setLevel(5);
            setYearsExperience("");
            setIsCertified(false);
            setLastUsedAt("");
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!skill) return;
        const payload: CreateSkillPayload = {
            skill_id: skill.skill_id,
            level,
        };
        const years = yearsExperience.trim();
        if (years) payload.years_experience = Number(years);
        if (isCertified) payload.is_certified = true;
        if (lastUsedAt.trim()) payload.last_used_at = lastUsedAt.trim();
        onSubmit(payload);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!isSubmitting}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Ajouter une compétence
                        </Heading>
                        <p className="mt-1 text-sm text-secondary">{skill?.skill_name ?? "—"}</p>

                        <div className="mt-6 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-primary">Niveau ({level}/10)</label>
                                <Slider
                                    minValue={0}
                                    maxValue={10}
                                    step={1}
                                    value={level}
                                    onChange={(v) => setLevel(Number(v))}
                                    isDisabled={isSubmitting}
                                    labelFormatter={(v) => `${v}/10`}
                                />
                            </div>

                            <div>
                                <label htmlFor="add-skill-years" className="mb-1.5 block text-sm font-medium text-primary">
                                    Années d&apos;expérience
                                </label>
                                <input
                                    id="add-skill-years"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={yearsExperience}
                                    onChange={(e) => setYearsExperience(e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </div>

                            <Toggle isSelected={isCertified} onChange={setIsCertified} isDisabled={isSubmitting}>
                                Certifié
                            </Toggle>

                            <div>
                                <label htmlFor="add-skill-last-used" className="mb-1.5 block text-sm font-medium text-primary">
                                    Dernière utilisation
                                </label>
                                <input
                                    id="add-skill-last-used"
                                    type="date"
                                    value={lastUsedAt}
                                    onChange={(e) => setLastUsedAt(e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button type="button" color="secondary" onClick={() => onOpenChange(false)} isDisabled={isSubmitting}>
                                Annuler
                            </Button>
                            <Button type="button" color="primary" onClick={handleSubmit} isLoading={isSubmitting} isDisabled={!skill}>
                                Ajouter
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
