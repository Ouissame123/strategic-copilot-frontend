import type { RhAvailabilityStatus } from "@/types/rh-availability.types";

export type RhAvailabilityStatusMeta = {
    label: string;
    badgeCls: string;
    dotCls: string;
};

const STATUS_META: Record<string, RhAvailabilityStatusMeta> = {
    available: {
        label: "Disponible",
        badgeCls:
            "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
        dotCls: "bg-emerald-500",
    },
    partially_available: {
        label: "Partiellement disponible",
        badgeCls:
            "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800",
        dotCls: "bg-sky-500",
    },
    nearly_full: {
        label: "Presque complet",
        badgeCls:
            "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
        dotCls: "bg-amber-500",
    },
    fully_loaded: {
        label: "Surchargé / indisponible",
        badgeCls:
            "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800",
        dotCls: "bg-rose-500",
    },
};

const UNKNOWN_META: RhAvailabilityStatusMeta = {
    label: "Disponibilité non calculée",
    badgeCls:
        "bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600",
    dotCls: "bg-slate-400",
};

/** `available_pct === 0` est une valeur valide (ne pas utiliser de test truthy). */
export function hasAvailabilityPct(value: number | null | undefined): boolean {
    return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

export function rhAvailabilityStatusMeta(status?: RhAvailabilityStatus | null): RhAvailabilityStatusMeta {
    const key = status?.toLowerCase().replace(/-/g, "_") ?? "";
    return STATUS_META[key] ?? UNKNOWN_META;
}

/** Badge dérivé charge / disponibilité (liste talents sans statut API overview). */
export function deriveAvailabilityBadgeMeta(
    currentLoadPct: number,
    availablePct: number,
): RhAvailabilityStatusMeta {
    const load = Number(currentLoadPct);
    const available = Number(availablePct);

    if (load >= 100) {
        return { ...STATUS_META.fully_loaded, label: "Surchargé" };
    }
    if (load >= 80) {
        return STATUS_META.nearly_full;
    }
    if (available === 100) {
        return STATUS_META.available;
    }
    if (available > 0 && available < 100) {
        return STATUS_META.partially_available;
    }
    if (available === 0) {
        return { ...STATUS_META.fully_loaded, label: "Surchargé" };
    }
    return UNKNOWN_META;
}

export type ResolveAvailabilityBadgeParams = {
    availabilityStatus?: RhAvailabilityStatus | null;
    currentLoadPct: number;
    availablePct: number | null | undefined;
    /** Prioriser le statut renvoyé par l’API overview si présent. */
    preferApiStatus?: boolean;
};

export function resolveAvailabilityBadgeMeta(params: ResolveAvailabilityBadgeParams): RhAvailabilityStatusMeta {
    if (!hasAvailabilityPct(params.availablePct)) {
        return UNKNOWN_META;
    }

    const available = Number(params.availablePct);
    if (
        params.preferApiStatus &&
        params.availabilityStatus &&
        rhAvailabilityStatusMeta(params.availabilityStatus) !== UNKNOWN_META
    ) {
        return rhAvailabilityStatusMeta(params.availabilityStatus);
    }

    return deriveAvailabilityBadgeMeta(params.currentLoadPct, available);
}

export function formatAvailabilityPct(value?: number | null): string {
    if (!hasAvailabilityPct(value)) return "—";
    return `${Math.round(Number(value))}%`;
}

/** Planifiée : `0` → `0%`, jamais `—` si la valeur numérique est définie. */
export function formatPlannedLoadPct(
    plannedLoadPct: number | null | undefined,
    hasAvailability: boolean,
): string {
    if (hasAvailabilityPct(plannedLoadPct)) {
        return formatAvailabilityPct(plannedLoadPct);
    }
    if (hasAvailability) {
        return "0%";
    }
    return "—";
}
