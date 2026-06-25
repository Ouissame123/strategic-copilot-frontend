import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { generateInitialPassword } from "@/hooks/useOnboardTalent";
import { useRhUsers } from "@/hooks/use-rh-users";
import type { OnboardTalentPayload } from "@/types/talent-onboard";
import {
    buildOnboardPayload,
    Field,
    PasswordField,
    SENIORITY_OPTIONS,
    useVisibleErrors,
    validateOnboardFields,
    type OnboardFormShape,
} from "./onboard-portal-shared";

export type NewTalentFormValues = OnboardFormShape;

export const NEW_TALENT_INITIAL_FORM: NewTalentFormValues = {
    name: "",
    email: "",
    password: "",
    job_title: "",
    department: "",
    seniority_level: "",
    manager_user_id: "",
    phone: "",
};

export type NewTalentFormHandle = {
    submit: () => void;
    isValid: boolean;
};

type NewTalentOnboardFormProps = {
    form: NewTalentFormValues;
    onFormChange: (form: NewTalentFormValues) => void;
    isBusy: boolean;
    resetKey?: string;
    nameInputRef?: React.RefObject<HTMLInputElement | null>;
    onSubmit: (payload: OnboardTalentPayload) => void;
    onValidChange?: (valid: boolean) => void;
};

export const NewTalentOnboardForm = forwardRef<NewTalentFormHandle, NewTalentOnboardFormProps>(
    function NewTalentOnboardForm(
        { form, onFormChange, isBusy, resetKey, nameInputRef, onSubmit, onValidChange },
        ref,
    ) {
        const internalNameRef = useRef<HTMLInputElement>(null);
        const nameRef = nameInputRef ?? internalNameRef;

        const [touched, setTouched] = useState<Record<string, boolean>>({});
        const [submitAttempted, setSubmitAttempted] = useState(false);

        const managersQuery = useRhUsers({ role: "manager", status: "active", limit: 500 });

        const errors = useMemo(() => validateOnboardFields(form), [form]);
        const isValid = Object.keys(errors).length === 0;
        const showError = useVisibleErrors(errors, touched, submitAttempted);

        useEffect(() => {
            onValidChange?.(isValid);
        }, [isValid, onValidChange]);

        useEffect(() => {
            setTouched({});
            setSubmitAttempted(false);
        }, [resetKey]);

        const managerOptions = useMemo(() => {
            const managers = managersQuery.data?.items ?? managersQuery.data?.users ?? [];
            return [
                { label: managersQuery.isLoading ? "Chargement…" : "— Aucun manager —", value: "" },
                ...managers.map((m) => ({
                    label: `${m.full_name} · ${m.managed_talents_count} talent${m.managed_talents_count > 1 ? "s" : ""}`,
                    value: m.id,
                })),
            ];
        }, [managersQuery.data?.items, managersQuery.data?.users, managersQuery.isLoading]);

        const touch = useCallback((field: string) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
        }, []);

        const handleSubmit = useCallback(() => {
            setSubmitAttempted(true);
            if (!isValid) return;
            onSubmit(buildOnboardPayload(form));
        }, [form, isValid, onSubmit]);

        useImperativeHandle(ref, () => ({ submit: handleSubmit, isValid }), [handleSubmit, isValid]);

        return (
            <div className="space-y-3">
                <Field
                    id="onboard-name"
                    label="Nom complet"
                    required
                    value={form.name}
                    onChange={(name) => onFormChange({ ...form, name })}
                    onBlur={() => touch("name")}
                    error={showError("name")}
                    disabled={isBusy}
                    autoComplete="name"
                    inputRef={nameRef}
                />

                <Field
                    id="onboard-email"
                    label="Email professionnel"
                    type="email"
                    required
                    value={form.email}
                    onChange={(email) => onFormChange({ ...form, email })}
                    onBlur={() => touch("email")}
                    error={showError("email")}
                    disabled={isBusy}
                    autoComplete="off"
                />

                <PasswordField
                    id="onboard-password"
                    value={form.password}
                    onChange={(password) => onFormChange({ ...form, password })}
                    onBlur={() => touch("password")}
                    onGenerate={() => onFormChange({ ...form, password: generateInitialPassword() })}
                    disabled={isBusy}
                    error={showError("password")}
                />

                <Field
                    id="onboard-job"
                    label="Poste / Job title"
                    required
                    value={form.job_title}
                    onChange={(job_title) => onFormChange({ ...form, job_title })}
                    onBlur={() => touch("job_title")}
                    error={showError("job_title")}
                    disabled={isBusy}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                        id="onboard-dept"
                        label="Département"
                        hint="optionnel"
                        value={form.department ?? ""}
                        onChange={(department) => onFormChange({ ...form, department })}
                        disabled={isBusy}
                    />
                    <div className="space-y-1">
                        <label htmlFor="onboard-seniority" className="flex items-center gap-1 text-xs font-medium text-primary">
                            Niveau de séniorité
                            <span className="font-normal text-tertiary">(optionnel)</span>
                        </label>
                        <NativeSelect
                            id="onboard-seniority"
                            value={form.seniority_level ?? ""}
                            onChange={(e) => onFormChange({ ...form, seniority_level: e.target.value })}
                            onBlur={() => touch("seniority_level")}
                            disabled={isBusy}
                            options={SENIORITY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                            selectClassName="!h-9 !py-1.5 !text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label htmlFor="onboard-manager" className="flex items-center gap-1 text-xs font-medium text-primary">
                            Manager assigné
                            <span className="font-normal text-tertiary">(optionnel)</span>
                        </label>
                        <NativeSelect
                            id="onboard-manager"
                            value={form.manager_user_id ?? ""}
                            onChange={(e) => onFormChange({ ...form, manager_user_id: e.target.value })}
                            onBlur={() => touch("manager_user_id")}
                            disabled={isBusy || managersQuery.isLoading}
                            options={managerOptions}
                            selectClassName="!h-9 !py-1.5 !text-sm"
                        />
                    </div>
                    <Field
                        id="onboard-phone"
                        label="Téléphone"
                        hint="optionnel"
                        type="tel"
                        value={form.phone ?? ""}
                        onChange={(phone) => onFormChange({ ...form, phone })}
                        disabled={isBusy}
                    />
                </div>
            </div>
        );
    },
);

export function validateNewTalentForm(form: NewTalentFormValues): string | null {
    const errors = validateOnboardFields(form);
    return Object.values(errors)[0] ?? null;
}
