import type { TalentProfileEditableField } from "@/types/talent-profile";
import { cx } from "@/utils/cx";

export type ProfileStatusTone = "emerald" | "slate" | "amber";

export const STATUS_BADGE: Record<string, { tone: ProfileStatusTone; label: string }> = {
    active: { tone: "emerald", label: "Actif" },
    inactive: { tone: "slate", label: "Inactif" },
    on_leave: { tone: "amber", label: "En congé" },
};

const TONE_CLASS: Record<ProfileStatusTone, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
};

export function statusBadgeClass(tone: ProfileStatusTone): string {
    return cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone]);
}

export const PROFILE_FIELD_LABELS: Record<TalentProfileEditableField, string> = {
    bio: "Bio",
    pro_phone: "Téléphone pro",
    address: "Adresse postale",
    city: "Ville",
    country: "Pays",
    personal_phone: "Téléphone perso",
};

export const PROFILE_INPUT_CLASS =
    "w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary shadow-xs outline-hidden transition focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:text-disabled";

export function formatProfileDate(value: string | null | undefined): string {
    if (!value) return "—";
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function profileInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function isFieldEditable(field: TalentProfileEditableField, editableFields: string[]): boolean {
    return editableFields.includes(field);
}
