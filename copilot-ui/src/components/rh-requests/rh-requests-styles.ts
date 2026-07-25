/** Boutons principaux page Demandes RH (primary teal). */
export const RH_ACTIVE_BUTTON_CLASSES =
    "bg-primary-600 text-white hover:bg-primary-700 border border-primary-600 shadow-sm dark:bg-primary-500 dark:border-primary-500 dark:hover:bg-primary-600";

export const RH_INACTIVE_BUTTON_CLASSES =
    "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800";

export const RH_PRIMARY_CTA_CLASSES = [
    "inline-flex items-center justify-center gap-1 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
    "disabled:cursor-not-allowed disabled:opacity-50",
    RH_ACTIVE_BUTTON_CLASSES,
].join(" ");
