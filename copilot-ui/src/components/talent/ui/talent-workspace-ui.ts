/** Tokens UI partagés — workspace Talent (présentation uniquement). */

export const TALENT_PAGE_STACK = "space-y-4";

export const TALENT_SURFACE =
    "rounded-lg border border-secondary/60 bg-primary shadow-sm dark:border-secondary/80";

/** Tuile KPI dashboard talent (grille 4 colonnes). */
export const TALENT_KPI_CARD =
    "h-full rounded-lg border border-secondary/60 bg-primary p-5 shadow-sm dark:border-secondary/80";

export const TALENT_KPI_STRIP =
    "flex overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm";

export const TALENT_KPI_CELL =
    "min-w-[7.5rem] flex-1 px-3 py-2.5 sm:min-w-0";

export const TALENT_KPI_CELL_DIVIDER = "border-r border-secondary/40 last:border-r-0";

export const TALENT_KPI_LABEL = "text-[10px] font-medium uppercase tracking-wider text-tertiary";

export const TALENT_KPI_VALUE = "text-base font-semibold tabular-nums leading-tight text-primary sm:text-lg";

export const TALENT_SEGMENTED =
    "inline-flex flex-wrap gap-0.5 rounded-md border border-secondary/60 bg-secondary_subtle/80 p-0.5";

export const TALENT_SEGMENT_ACTIVE =
    "bg-primary font-medium text-primary shadow-sm ring-1 ring-secondary/40";

export const TALENT_SEGMENT_IDLE = "text-tertiary hover:text-secondary";

export type TalentKpiTone = "default" | "amber" | "emerald" | "red" | "brand" | "violet";

export const TALENT_KPI_TONE_CELL: Record<TalentKpiTone, string> = {
    default: "",
    amber: "bg-amber-50/60 dark:bg-amber-950/25",
    emerald: "bg-emerald-50/60 dark:bg-emerald-950/25",
    red: "bg-red-50/60 dark:bg-red-950/25",
    brand: "bg-brand-primary/5",
    violet: "bg-violet-50/60 dark:bg-violet-950/25",
};

export type TalentSurfaceAccent = "default" | "ai" | "action" | "alert";

export const TALENT_SURFACE_ACCENT: Record<TalentSurfaceAccent, string> = {
    default: "",
    ai: "border-l-[3px] border-l-violet-500",
    action: "border-l-[3px] border-l-brand-secondary",
    alert: "border-l-[3px] border-l-amber-500",
};
