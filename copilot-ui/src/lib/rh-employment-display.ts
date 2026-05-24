/**
 * Affichage emploi / contrat — badges, ancienneté, salaire, statut contrat.
 */
import type { LucideIcon } from "lucide-react";
import { Briefcase, Clock, FileCheck, GraduationCap } from "lucide-react";
import { parseFlexibleDateToIso } from "@/lib/rh-date-iso";
import type { EmploymentData } from "@/types/rh-employment.types";

export type ContractBadgeMeta = {
    label: string;
    cls: string;
    Icon: LucideIcon;
};

const CONTRACT_BADGES: Record<string, ContractBadgeMeta> = {
    CDI: {
        label: "CDI",
        cls: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800",
        Icon: FileCheck,
    },
    CDD: {
        label: "CDD",
        cls: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
        Icon: Clock,
    },
    FREELANCE: {
        label: "Freelance",
        cls: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800",
        Icon: Briefcase,
    },
    STAGE: {
        label: "Stage",
        cls: "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800",
        Icon: GraduationCap,
    },
    INTERNSHIP: {
        label: "Internship",
        cls: "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800",
        Icon: GraduationCap,
    },
    PART_TIME: {
        label: "Part-time",
        cls: "bg-teal-100 text-teal-900 ring-1 ring-teal-200/80 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-800",
        Icon: Clock,
    },
};

export function normalizeContractTypeKey(raw?: string | null): string | null {
    if (!raw?.trim()) return null;
    const u = raw.trim().toUpperCase().replace(/\s+/g, "_");
    if (u.includes("CDI")) return "CDI";
    if (u.includes("CDD")) return "CDD";
    if (u.includes("FREE") || u.includes("INDEP")) return "FREELANCE";
    if (u.includes("PART")) return "PART_TIME";
    if (u.includes("INTERN")) return "INTERNSHIP";
    if (u.includes("STAGE")) return "STAGE";
    return u;
}

export function resolveContractBadge(contractType?: string | null): ContractBadgeMeta | null {
    const key = normalizeContractTypeKey(contractType);
    if (!key) return null;
    return (
        CONTRACT_BADGES[key] ?? {
            label: contractType?.trim() ?? key,
            cls: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
            Icon: Briefcase,
        }
    );
}

export function daysUntilDate(d?: string | null): number | null {
    if (!d?.trim()) return null;
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return null;
    return Math.ceil((t.getTime() - Date.now()) / 86400000);
}

/** Ancienneté fournie par le backend (`tenure_years`, `tenure_months`). */
export function formatTenureFromBackend(
    years?: number | null,
    months?: number | null,
): string | null {
    if (years == null && months == null) return null;
    const y = Math.max(0, years ?? 0);
    const m = Math.max(0, months ?? 0);
    if (y === 0 && m === 0) return "0 mois";
    const parts: string[] = [];
    if (y > 0) parts.push(`${y} an${y > 1 ? "s" : ""}`);
    if (m > 0) parts.push(`${m} mois`);
    return parts.join(" ");
}

export function formatSalaryDisplay(salary?: string | number | null, opts?: { compact?: boolean }): string | null {
    if (salary == null || salary === "") return null;
    const n =
        typeof salary === "number"
            ? salary
            : Number(String(salary).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
        const raw = String(salary).trim();
        return raw || null;
    }
    if (opts?.compact && n >= 1000) {
        const k = n / 1000;
        const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
        return `${rounded}k MAD`;
    }
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} MAD`;
}

export function hasEmploymentData(employment: EmploymentData | null | undefined): boolean {
    if (!employment) return false;
    return Boolean(
        employment.role?.trim() ||
            employment.contract_type?.trim() ||
            (employment.salary != null && employment.salary !== "") ||
            employment.integration_date?.trim() ||
            employment.contract_end_date?.trim(),
    );
}

export function contractExpiryMeta(endDate?: string | null): {
    days: number | null;
    showWarning: boolean;
    urgency: "none" | "warn" | "danger";
    label: string | null;
    status: "active" | "expired" | "open";
} {
    if (!endDate?.trim()) {
        return { days: null, showWarning: false, urgency: "none", label: null, status: "open" };
    }
    const days = daysUntilDate(endDate);
    if (days == null) {
        return { days: null, showWarning: false, urgency: "none", label: null, status: "open" };
    }
    if (days < 0) {
        return {
            days,
            showWarning: true,
            urgency: "danger",
            label: "Contrat expiré",
            status: "expired",
        };
    }
    if (days <= 90) {
        return {
            days,
            showWarning: true,
            urgency: days <= 30 ? "danger" : "warn",
            label: `Expire dans ${days} jour${days > 1 ? "s" : ""}`,
            status: "active",
        };
    }
    return { days, showWarning: false, urgency: "none", label: null, status: "active" };
}

export function contractStatusBadgeMeta(endDate?: string | null): {
    label: string;
    cls: string;
} {
    const meta = contractExpiryMeta(endDate);
    if (meta.status === "expired") {
        return {
            label: "Contrat expiré",
            cls: "bg-rose-100 text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/50",
        };
    }
    if (meta.status === "open") {
        return {
            label: "Contrat actif",
            cls: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/50",
        };
    }
    return {
        label: "Contrat actif",
        cls: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/50",
    };
}

export function fmtEmploymentDate(d?: string | null): string | null {
    const iso = parseFlexibleDateToIso(d);
    if (!iso) return null;
    const t = new Date(`${iso}T12:00:00.000Z`);
    if (Number.isNaN(t.getTime())) return null;
    return t.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** KPI « Contrat » — vue d’ensemble talent (API employment prioritaire). */
export function overviewContractKpi(
    employment: EmploymentData | null | undefined,
    fallbackEndDate?: string | null,
): { value: string; sub: string; tone: "neutral" | "warn" | "danger" | "success" } {
    const endRaw = employment?.contract_end_date?.trim() || fallbackEndDate?.trim() || "";
    const end = endRaw || null;
    const badge = resolveContractBadge(employment?.contract_type);
    const hasData = hasEmploymentData(employment);

    if (!hasData && !end) {
        return { value: "—", sub: "Non renseigné", tone: "neutral" };
    }

    const typeLabel = badge?.label ?? employment?.contract_type?.trim() ?? "Contrat";
    const expiry = contractExpiryMeta(end);
    const endLabel = fmtEmploymentDate(end);

    if (expiry.days != null && expiry.days >= 0) {
        return {
            value: `${expiry.days}j`,
            sub: endLabel ? `Fin ${endLabel}` : `Fin dans ${expiry.days}j`,
            tone: expiry.urgency === "danger" ? "danger" : expiry.urgency === "warn" ? "warn" : "neutral",
        };
    }

    if (expiry.status === "expired" && expiry.days != null) {
        return {
            value: typeLabel,
            sub: "Contrat expiré",
            tone: "danger",
        };
    }

    if (end && endLabel) {
        return { value: endLabel, sub: `Fin ${endLabel}`, tone: "neutral" };
    }

    return {
        value: typeLabel,
        sub: "Sans date de fin",
        tone: "success",
    };
}
