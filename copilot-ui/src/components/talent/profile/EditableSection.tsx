import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import {
    isFieldEditable,
    PROFILE_FIELD_LABELS,
    PROFILE_INPUT_CLASS,
} from "@/components/talent/profile/talent-profile-ui";
import { useUpdateTalentProfile } from "@/hooks/useTalentProfile";
import type { TalentProfileEditable, TalentProfileEditableField } from "@/types/talent-profile";

const editableSchema = z.object({
    bio: z.string().max(1000, "Maximum 1000 caractères"),
    pro_phone: z.string().max(40, "Maximum 40 caractères"),
    address: z.string().max(200, "Maximum 200 caractères"),
    city: z.string().max(100, "Maximum 100 caractères"),
    country: z.string().max(100, "Maximum 100 caractères"),
    personal_phone: z.string().max(40, "Maximum 40 caractères"),
});

type EditableFormValues = z.infer<typeof editableSchema>;

type EditableSectionProps = {
    editable: TalentProfileEditable;
    editableFields: string[];
};

const FIELD_ORDER: TalentProfileEditableField[] = [
    "bio",
    "pro_phone",
    "address",
    "city",
    "country",
    "personal_phone",
];

export function EditableSection({ editable, editableFields }: EditableSectionProps) {
    const updateMutation = useUpdateTalentProfile();

    const form = useForm<EditableFormValues>({
        resolver: zodResolver(editableSchema),
        defaultValues: editable,
        mode: "onChange",
    });

    useEffect(() => {
        form.reset(editable);
    }, [editable, form]);

    const onSubmit = form.handleSubmit((values) => {
        const payload: Partial<TalentProfileEditable> = {};
        for (const field of FIELD_ORDER) {
            if (!isFieldEditable(field, editableFields)) continue;
            payload[field] = values[field];
        }
        updateMutation.mutate(payload);
    });

    const handleCancel = () => form.reset(editable);

    return (
        <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/60 sm:p-6">
            <h2 className="text-sm font-semibold text-primary">Coordonnées</h2>
            <p className="mt-0.5 text-xs text-tertiary">Bio, téléphones et adresse personnelle</p>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                <Controller
                    name="bio"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <div>
                            <TextArea
                                label={PROFILE_FIELD_LABELS.bio}
                                placeholder="Parlez de votre parcours, vos passions…"
                                value={field.value}
                                onChange={field.onChange}
                                isDisabled={!isFieldEditable("bio", editableFields) || updateMutation.isPending}
                                rows={4}
                                hint={fieldState.error?.message}
                            />
                        </div>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    {(["pro_phone", "personal_phone"] as const).map((fieldName) => (
                        <label key={fieldName} className="grid gap-1.5">
                            <span className="text-sm font-medium text-primary">{PROFILE_FIELD_LABELS[fieldName]}</span>
                            <input
                                {...form.register(fieldName)}
                                type="tel"
                                disabled={!isFieldEditable(fieldName, editableFields) || updateMutation.isPending}
                                className={PROFILE_INPUT_CLASS}
                            />
                            {form.formState.errors[fieldName]?.message ? (
                                <span className="text-xs text-error-primary">{form.formState.errors[fieldName]?.message}</span>
                            ) : null}
                        </label>
                    ))}
                </div>

                <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-primary">{PROFILE_FIELD_LABELS.address}</span>
                    <input
                        {...form.register("address")}
                        disabled={!isFieldEditable("address", editableFields) || updateMutation.isPending}
                        className={PROFILE_INPUT_CLASS}
                    />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    {(["city", "country"] as const).map((fieldName) => (
                        <label key={fieldName} className="grid gap-1.5">
                            <span className="text-sm font-medium text-primary">{PROFILE_FIELD_LABELS[fieldName]}</span>
                            <input
                                {...form.register(fieldName)}
                                disabled={!isFieldEditable(fieldName, editableFields) || updateMutation.isPending}
                                className={PROFILE_INPUT_CLASS}
                            />
                        </label>
                    ))}
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        color="secondary"
                        isDisabled={updateMutation.isPending || !form.formState.isDirty}
                        onClick={handleCancel}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        color="primary"
                        isLoading={updateMutation.isPending}
                        isDisabled={updateMutation.isPending || !form.formState.isDirty}
                    >
                        Enregistrer
                    </Button>
                </div>
            </form>
        </section>
    );
}
