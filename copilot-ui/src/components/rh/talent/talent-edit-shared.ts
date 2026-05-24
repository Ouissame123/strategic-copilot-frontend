/**
 * Logique formulaire édition talent RH — partagée drawer / modal.
 */
import type { UpdateRhTalentPayload } from "@/types/rh-talents.types";
import type { RhTalentEditInitial } from "@/components/rh/EditTalentModal";

export type EditTalentForm = {
    name: string;
    email: string;
    phone: string;
    job_title: string;
    department: string;
    seniority_level: string;
    status: string;
    hire_date: string;
    bio: string;
};

export function isValidTalentEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function toDateInputValue(d?: string | null): string {
    if (!d?.trim()) return "";
    const parsed = new Date(d);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return d.trim().slice(0, 10);
}

export function toFormState(t: RhTalentEditInitial): EditTalentForm {
    return {
        name: t.name,
        email: t.email ?? "",
        phone: t.phone ?? "",
        job_title: t.job_title ?? "",
        department: t.department ?? "",
        seniority_level: t.seniority_level ?? "",
        status: t.status || "active",
        hire_date: toDateInputValue(t.hire_date),
        bio: t.bio ?? "",
    };
}

export function buildUpdatePayload(initial: EditTalentForm, current: EditTalentForm): UpdateRhTalentPayload {
    const payload: UpdateRhTalentPayload = {};
    if (current.name.trim() !== initial.name.trim()) payload.name = current.name.trim();
    if (current.email.trim() !== initial.email.trim()) payload.email = current.email.trim();
    if (current.phone.trim() !== initial.phone.trim()) payload.phone = current.phone.trim() || null;
    if (current.job_title.trim() !== initial.job_title.trim()) payload.job_title = current.job_title.trim() || null;
    if (current.department.trim() !== initial.department.trim()) {
        payload.department = current.department.trim() || null;
    }
    if (current.seniority_level.trim() !== initial.seniority_level.trim()) {
        payload.seniority_level = current.seniority_level.trim() || null;
    }
    if (current.status.trim() !== initial.status.trim()) payload.status = current.status.trim();
    if (current.hire_date.trim() !== initial.hire_date.trim()) payload.hire_date = current.hire_date.trim() || null;
    if (current.bio.trim() !== initial.bio.trim()) payload.bio = current.bio.trim() || null;
    return payload;
}

export function validateEditTalentForm(form: EditTalentForm): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Le nom est obligatoire.";
    if (!form.email.trim()) errors.email = "L’email est obligatoire.";
    else if (!isValidTalentEmail(form.email)) errors.email = "Adresse email invalide.";
    return errors;
}
