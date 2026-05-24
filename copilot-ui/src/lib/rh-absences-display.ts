import type { RhAbsenceStatus, RhAbsenceType } from "@/types/rh-absences.types";

const TYPE_LABELS: Record<string, string> = {
    sick: "Maladie",
    vacation: "Congés",
    training: "Formation",
    other: "Autre",
    unpaid: "Sans solde",
};

const STATUS_META: Record<
    RhAbsenceStatus,
    { label: string; cls: string }
> = {
    current: {
        label: "En cours",
        cls: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
    },
    upcoming: {
        label: "À venir",
        cls: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800",
    },
    past: {
        label: "Passée",
        cls: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    },
};

export const RH_ABSENCE_TYPE_OPTIONS: { value: RhAbsenceType; label: string }[] = [
    { value: "sick", label: "Maladie" },
    { value: "vacation", label: "Congés" },
    { value: "training", label: "Formation" },
    { value: "other", label: "Autre" },
    { value: "unpaid", label: "Sans solde" },
];

export function absenceTypeLabel(type?: string | null): string {
    if (!type) return "—";
    return TYPE_LABELS[type.toLowerCase()] ?? type;
}

export function absenceStatusMeta(status?: string | null): { label: string; cls: string } {
    const key = (status?.toLowerCase() ?? "past") as RhAbsenceStatus;
    return STATUS_META[key] ?? STATUS_META.past;
}

export function fmtAbsenceDate(d?: string | null): string {
    if (!d?.trim()) return "—";
    const t = new Date(`${d.includes("T") ? d : `${d}T12:00:00.000Z`}`);
    if (Number.isNaN(t.getTime())) return d;
    return t.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatAbsenceDuration(days: number | null | undefined): string {
    if (days == null || !Number.isFinite(days)) return "—";
    const n = Math.max(0, Math.round(days));
    if (n === 0) return "0 jour";
    return `${n} jour${n > 1 ? "s" : ""}`;
}
