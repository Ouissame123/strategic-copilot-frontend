/** Tokens visuels partagés — Mobilité & réaffectation (talent → manager). */
import { cx } from "@/utils/cx";

export const MOBILITY_SURFACE = cx(
    "rounded-xl border border-slate-200/70 bg-white/95 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90",
);

export const MOBILITY_BOARD_HEADER = cx(
    "hidden border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_7.5rem_auto] lg:gap-3 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

export const MOBILITY_ROW_GRID = cx(
    "grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_7.5rem_auto] lg:items-center lg:gap-3",
);
