import { useCallback, useState } from "react";
import { Briefcase, Check, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import type { UnlinkedTalent } from "@/types/rh-portal-access.types";
import type { OnboardTalentResponse } from "@/types/talent-onboard";
import { cx } from "@/utils/cx";

export const ONBOARD_INPUT_COMPACT_CLASS =
    "h-9 w-full rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

/** @deprecated use ONBOARD_INPUT_COMPACT_CLASS */
export const ONBOARD_INPUT_CLASS = ONBOARD_INPUT_COMPACT_CLASS;

export const ONBOARD_DESCRIPTIONS = {
    new: "Créer un nouveau talent + son compte de connexion en une seule opération (transaction atomique).",
    existing: "Sélectionner un talent existant (sans accès portail) et créer son compte de connexion.",
} as const;

export const SENIORITY_OPTIONS = [
    { value: "", label: "— Non renseigné —" },
    { value: "Stagiaire", label: "Stagiaire" },
    { value: "Junior", label: "Junior" },
    { value: "Mid", label: "Mid" },
    { value: "Senior", label: "Senior" },
    { value: "Lead", label: "Lead" },
    { value: "Expert", label: "Expert" },
    { value: "Freelance", label: "Freelance" },
] as const;

export type OnboardFormShape = {
    name: string;
    email: string;
    password: string;
    job_title: string;
    department?: string;
    seniority_level?: string;
    manager_user_id?: string;
    phone?: string;
};

export function validateOnboardFields(form: OnboardFormShape): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Nom complet requis";
    if (!form.email?.trim() || !form.email.includes("@")) e.email = "Email invalide (doit contenir @)";
    if (!form.password || form.password.length < 8) e.password = "Min 8 caractères";
    if (!form.job_title?.trim()) e.job_title = "Poste requis";
    return e;
}

export function validateGrantFields(selectedTalentId: string, password: string): Record<string, string> {
    const e: Record<string, string> = {};
    if (!selectedTalentId) e.talent = "Sélectionnez un talent";
    if (!password || password.length < 8) e.password = "Min 8 caractères";
    return e;
}

export function buildOnboardPayload(form: OnboardFormShape) {
    return {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        job_title: form.job_title.trim(),
        ...(form.department?.trim() && { department: form.department.trim() }),
        ...(form.seniority_level?.trim() && { seniority_level: form.seniority_level.trim() }),
        ...(form.manager_user_id?.trim() && { manager_user_id: form.manager_user_id.trim() }),
        ...(form.phone?.trim() && { phone: form.phone.trim() }),
    };
}

export function useVisibleErrors(
    errors: Record<string, string>,
    touched: Record<string, boolean>,
    submitAttempted: boolean,
) {
    return useCallback(
        (field: string) => ((touched[field] || submitAttempted) ? errors[field] : undefined),
        [errors, touched, submitAttempted],
    );
}

export function FieldLabel({
    htmlFor,
    required = false,
    hint,
    compact = false,
    children,
}: {
    htmlFor?: string;
    required?: boolean;
    hint?: string;
    compact?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className={cx(
                "flex flex-wrap items-center gap-1 font-medium text-primary",
                compact ? "text-xs" : "mb-1.5 text-sm",
            )}
        >
            {children}
            {required ? (
                <span className="text-error-primary" aria-label="requis">
                    *
                </span>
            ) : null}
            {hint ? <span className="font-normal text-tertiary">({hint})</span> : null}
        </label>
    );
}

export function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-error-primary">{message}</p>;
}

type FieldProps = {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    autoComplete?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function Field({
    id,
    label,
    required,
    hint,
    error,
    type = "text",
    value,
    onChange,
    onBlur,
    disabled,
    autoComplete,
    inputRef,
}: FieldProps) {
    return (
        <div className="space-y-1">
            <FieldLabel htmlFor={id} required={required} hint={hint} compact>
                {label}
            </FieldLabel>
            <input
                ref={inputRef}
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                autoComplete={autoComplete}
                className={cx(ONBOARD_INPUT_COMPACT_CLASS, error && "border-error-primary ring-1 ring-error-primary")}
            />
            <FieldError message={error} />
        </div>
    );
}

function talentInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function CompactTalentPreview({ talent }: { talent: UnlinkedTalent }) {
    return (
        <div className="rounded-md border border-secondary bg-secondary_subtle/40 p-2.5">
            <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-secondary/10 text-[10px] font-semibold text-primary">
                    {talentInitials(talent.name)}
                </div>
                <strong className="truncate text-sm text-primary">{talent.name}</strong>
            </div>
            <p className="mt-1 truncate text-xs text-tertiary">
                {talent.email}
                {" · "}
                {talent.job_title}
                {talent.has_manager && talent.manager_name ? ` · Mgr: ${talent.manager_name}` : ""}
            </p>
        </div>
    );
}

/** @deprecated use CompactTalentPreview */
export function TalentPreviewCard({ talent }: { talent: UnlinkedTalent }) {
    return <CompactTalentPreview talent={talent} />;
}

export function CopyButton({
    value,
    ariaLabel = "Copier",
    iconOnly = false,
}: {
    value: string;
    ariaLabel?: string;
    iconOnly?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    if (iconOnly) {
        return (
            <Button
                type="button"
                color="secondary"
                size="sm"
                onClick={() => void handleCopy()}
                isDisabled={!value}
                aria-label={ariaLabel}
                className="!h-9 !w-9 shrink-0 !px-0"
                iconLeading={copied ? Check : Copy}
            />
        );
    }

    return (
        <Button
            type="button"
            color="secondary"
            size="sm"
            onClick={() => void handleCopy()}
            isDisabled={!value}
            aria-label={ariaLabel}
            iconLeading={copied ? Check : Copy}
            className={copied ? "[&_svg]:text-emerald-600" : undefined}
        >
            {copied ? "Copié" : "Copier"}
        </Button>
    );
}

export function CredentialRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-secondary bg-secondary_subtle/60 px-3 py-2">
            <div className="min-w-0 flex-1">
                <p className="text-xs text-tertiary">{label}</p>
                <p className={cx("truncate text-sm font-medium text-primary", mono && "font-mono")}>{value}</p>
            </div>
            <CopyButton value={value} ariaLabel={`Copier ${label.toLowerCase()}`} iconOnly />
        </div>
    );
}

export function CopyRow({
    label,
    value,
    onCopy,
    copyLabel,
}: {
    label: string;
    value: string;
    onCopy: () => void;
    copyLabel: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-secondary bg-secondary_subtle/60 px-3 py-2.5">
            <div className="min-w-0 flex-1">
                <p className="text-xs text-tertiary">{label}</p>
                <p className="truncate font-medium text-primary">{value}</p>
            </div>
            <Button type="button" color="secondary" size="sm" onClick={onCopy} aria-label={copyLabel}>
                Copier
            </Button>
        </div>
    );
}

type OnboardSuccessPanelProps = {
    response: OnboardTalentResponse;
    password: string;
    onClose: () => void;
    onReset: () => void;
    resetLabel?: string;
};

export function OnboardSuccessPanel({
    response,
    password,
    onClose,
    onReset,
    resetLabel = "Créer un autre talent",
}: OnboardSuccessPanelProps) {
    const title =
        response.operation === "grant_access" ? "Accès portail créé" : "Talent créé avec accès portail";

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="flex items-start gap-3 pr-8">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                        <h2 className="text-base font-semibold text-primary">{title}</h2>
                        {response.message ? <p className="mt-1 text-sm text-secondary">{response.message}</p> : null}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium text-primary">Identifiants à transmettre au talent</p>
                    <CredentialRow label="Email" value={response.login_info.email} />
                    <CredentialRow label="Mot de passe" value={password} mono />
                    <CredentialRow label="Portail" value={response.login_info.portal_url} mono />
                </div>

                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    ⚠️ {response.login_info.note || "Communiquez le mot de passe au talent en sécurité"}
                </p>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-secondary px-6 py-4">
                <Button type="button" color="secondary" onClick={onClose}>
                    Fermer
                </Button>
                <Button type="button" color="primary" iconLeading={Briefcase} onClick={onReset}>
                    {resetLabel}
                </Button>
            </div>
        </div>
    );
}

type PasswordFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onGenerate: () => void;
    disabled?: boolean;
    error?: string;
    required?: boolean;
};

export function PasswordField({
    id,
    value,
    onChange,
    onBlur,
    onGenerate,
    disabled,
    error,
    required = true,
}: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-1">
            <FieldLabel htmlFor={id} required={required} hint={required ? "min 8 caractères" : undefined} compact>
                Mot de passe initial
            </FieldLabel>
            <div className="flex gap-1">
                <div className="relative min-w-0 flex-1">
                    <input
                        id={id}
                        type={showPassword ? "text" : "password"}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        disabled={disabled}
                        className={cx(
                            ONBOARD_INPUT_COMPACT_CLASS,
                            "pr-9",
                            error && "border-error-primary ring-1 ring-error-primary",
                        )}
                        autoComplete="new-password"
                        placeholder="Min 8 caractères"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={disabled}
                        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-tertiary hover:text-primary"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                </div>
                <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    onClick={onGenerate}
                    isDisabled={disabled}
                    className="!h-9 shrink-0 !px-2 text-xs"
                >
                    Générer
                </Button>
                <CopyButton value={value} ariaLabel="Copier le mot de passe" iconOnly />
            </div>
            <FieldError message={error} />
        </div>
    );
}
