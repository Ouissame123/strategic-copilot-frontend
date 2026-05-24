/** Boutons principaux page Demandes RH (violet #7C3AED). */
export const RH_ACTIVE_BUTTON_CLASSES =
    "bg-violet-600 text-white hover:bg-violet-700 border border-violet-600 shadow-sm dark:bg-violet-500 dark:border-violet-500 dark:hover:bg-violet-600";

export const RH_INACTIVE_BUTTON_CLASSES =
    "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800";

export const RH_PRIMARY_CTA_CLASSES = [
    "inline-flex items-center justify-center gap-1 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition",
    RH_ACTIVE_BUTTON_CLASSES,
].join(" ");
