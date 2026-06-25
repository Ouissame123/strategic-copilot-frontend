import type { BudgetZone } from "@/types/manager-project-budget.types";
import { cx } from "@/utils/cx";

const FROZEN_STATUSES = new Set(["completed", "cancelled", "archived"]);

export function isProjectBudgetFrozen(status: string | null | undefined): boolean {
    const s = String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
    return FROZEN_STATUSES.has(s);
}

/** Alias — projet `completed | cancelled | archived` : champs éditables figés. */
export const isProjectFrozen = isProjectBudgetFrozen;

export function formatBudgetEur(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function parseBudgetInput(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

export function isBudgetAmountValid(amount: number | null): boolean {
    return amount != null && amount >= 0 && amount <= 10_000_000;
}

export function computeOptimisticBudgetZone(
    planned: number,
    actual: number,
): { zone: BudgetZone; badge: string; ratio: number | null; consumed_pct: number | null } {
    const ratio = planned > 0 ? actual / planned : null;
    if (ratio === null) {
        return { zone: "unset", badge: "Budget non défini", ratio: null, consumed_pct: null };
    }
    if (ratio < 0.7) return { zone: "green", badge: "Sous contrôle", ratio, consumed_pct: Math.round(ratio * 100) };
    if (ratio < 0.9) return { zone: "amber", badge: "À surveiller", ratio, consumed_pct: Math.round(ratio * 100) };
    if (ratio <= 1) return { zone: "orange", badge: "Limite atteinte", ratio, consumed_pct: Math.round(ratio * 100) };
    return { zone: "red", badge: "Dépassement", ratio, consumed_pct: Math.round(ratio * 100) };
}

export function budgetZoneBadgeClass(zone: BudgetZone): string {
    switch (zone) {
        case "green":
            return "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
        case "amber":
            return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
        case "orange":
            return "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
        case "red":
            return "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
        default:
            return "border-slate-200 bg-slate-100 text-slate-600 italic dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300";
    }
}

export function budgetChangeTypeDotClass(changeType: string): string {
    switch (changeType) {
        case "manual_edit":
            return "bg-emerald-500";
        case "auto_recompute":
            return "bg-slate-400";
        case "reset":
            return "bg-orange-500";
        case "initial":
            return "bg-blue-500";
        default:
            return "bg-slate-300";
    }
}

export function budgetChangeTypeLabel(changeType: string): string {
    switch (changeType) {
        case "manual_edit":
            return "Édition manuelle";
        case "auto_recompute":
            return "Recalcul auto";
        case "reset":
            return "Réinitialisation";
        case "initial":
            return "Initialisation";
        default:
            return changeType;
    }
}

export function formatRelativeDate(iso: string, locale = "fr-FR"): { relative: string; absolute: string } {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { relative: "—", absolute: "—" };
    const absolute = date.toLocaleString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    let relative: string;
    if (diffDays <= 0) relative = "aujourd'hui";
    else if (diffDays === 1) relative = "il y a 1 jour";
    else if (diffDays < 30) relative = `il y a ${diffDays} jours`;
    else if (diffDays < 365) relative = `il y a ${Math.floor(diffDays / 30)} mois`;
    else relative = `il y a ${Math.floor(diffDays / 365)} an(s)`;
    return { relative, absolute };
}

export function budgetProgressBarClass(zone: BudgetZone): string {
    return cx(
        "h-full rounded-full transition-all duration-300",
        zone === "green" && "bg-emerald-500",
        zone === "amber" && "bg-amber-500",
        zone === "orange" && "bg-orange-500",
        zone === "red" && "bg-red-500",
        zone === "unset" && "bg-slate-300",
    );
}
