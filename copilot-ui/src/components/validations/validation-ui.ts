import type { ValidationCategory } from "@/services/validations.api";

export const validationCardClass =
    "rounded-xl border border-secondary/90 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

export const validationBucketConfig: Record<
    ValidationCategory,
    {
        label: string;
        description: string;
        indicator: string;
        badge: string;
    }
> = {
    conflict: {
        label: "Bloquant",
        description: "Alertes critiques ou doublons à traiter en urgence",
        indicator: "bg-red-500",
        badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    },
    missing_justification: {
        label: "Justification manquante",
        description: "Information incomplète, validation impossible en l'état",
        indicator: "bg-amber-500",
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    standard: {
        label: "File standard",
        description: "Triées par priorité et ancienneté",
        indicator: "bg-slate-400",
        badge: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
};

export const validationTypeBadge: Record<string, string> = {
    rh_action: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    arbitrage: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    decision: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const validationTypeLabel: Record<string, string> = {
    rh_action: "Action RH",
    arbitrage: "Arbitrage",
    decision: "Décision",
};
