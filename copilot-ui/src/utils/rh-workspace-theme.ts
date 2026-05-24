/**
 * Classes workspace RH — light explicite (slate/white) + dark inchangé via préfixe `dark:`.
 */
import { cx } from "@/utils/cx";

/** Fond zone contenu principale */
export const WS_CANVAS = "bg-[#f8fafc] dark:bg-ws-canvas";

/** Carte / panneau */
export const WS_CARD =
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
export const WS_CARD_SM = "rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";

/** Sidebar — light : fond blanc, liens slate-600 ; dark : inchangé (ws-sidebar) */
export const WS_SIDEBAR = cx(
    "border-slate-200 !bg-white text-slate-600",
    "[&_.border-secondary]:border-slate-200 [&_.bg-secondary]:!bg-white",
    "[&_.text-fg-quaternary]:text-slate-400 [&_.text-secondary]:text-slate-600",
    "dark:border-ws-sidebar-border dark:!bg-ws-sidebar dark:text-ws-nav",
    "dark:[&_.border-secondary]:border-ws-sidebar-border dark:[&_.bg-secondary]:!bg-ws-sidebar",
    "dark:[&_.text-fg-quaternary]:text-fg-quaternary dark:[&_.text-secondary]:text-secondary",
);

export const WS_SIDEBAR_NAV_ACTIVE = cx(
    "[&_[aria-current=page]]:!border-slate-200 [&_[aria-current=page]]:!bg-slate-100 [&_[aria-current=page]]:shadow-none",
    "[&_[aria-current=page]_span]:!text-slate-900 [&_[aria-current=page]_.text-brand-primary]:!text-violet-700",
    "[&_span]:text-slate-600 [&_a]:bg-transparent [&_a]:text-slate-600 [&_summary]:text-slate-600",
    "[&_a:hover]:!bg-slate-50 [&_a:hover_span]:!text-slate-900",
    "[&_button:not(:disabled)]:text-slate-600 [&_button:hover]:bg-slate-50",
    "[&_button:disabled]:text-slate-400 [&_button:disabled]:opacity-70",
    "dark:[&_[aria-current=page]]:border-ws-border dark:[&_[aria-current=page]]:bg-ws-nav-bg-active",
    "dark:[&_[aria-current=page]_span]:!text-ws-nav-active dark:[&_[aria-current=page]_.text-brand-primary]:!text-brand-primary",
    "dark:[&_span]:text-ws-nav dark:[&_a]:text-ws-nav dark:[&_summary]:text-ws-nav",
);

/** Typographie */
export const WS_TEXT_PRIMARY = "text-slate-900 dark:text-slate-100";
export const WS_TEXT_SECONDARY = "text-slate-600 dark:text-slate-300";
export const WS_TEXT_MUTED = "text-slate-500 dark:text-slate-400";
export const WS_TEXT_FAINT = "text-slate-400 dark:text-slate-500";

/** Surfaces utilitaires */
export const WS_SUBTLE = "bg-slate-50 dark:bg-slate-800";
export const WS_MUTED_SURFACE = "bg-slate-50 dark:bg-slate-800";

/** Barre filtres / topbar RH */
export const WS_FILTER_BAR =
    "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";

/** Select natif */
export const WS_SELECT =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

/** Badge compétence / chip */
export const WS_SKILL_BADGE =
    "rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

/** Alertes */
export const WS_ALERT_ERROR =
    "rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
export const WS_ALERT_WARN =
    "rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";

/** Statuts talent */
export const RH_STATUS_ACTIVE =
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";
export const RH_STATUS_INACTIVE = "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
export const RH_STATUS_ON_LEAVE = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200";

export const RH_FILTER_ACTIVE =
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";

/** Boutons */
export const WS_BTN_PRIMARY =
    "bg-ws-accent text-white shadow-sm hover:bg-ws-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ws-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ws-canvas)]";

export const WS_BTN_SECONDARY =
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

/** Champs */
export const WS_INPUT =
    "rounded-lg border border-slate-200 bg-white text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-ws-accent focus:ring-2 focus:ring-violet-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export const WS_MODAL_OVERLAY = "bg-[color:var(--ws-overlay)]";

export const WS_AVATAR = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

export const WS_LINK = "text-ws-accent hover:text-ws-accent-hover hover:underline";

export const WS_DIVIDER = "border-slate-200 dark:border-slate-700";

/** Alias RH (rétrocompat composants existants) */
export const RH_SURFACE = WS_CANVAS;
export const RH_SURFACE_CARD = "bg-white dark:bg-slate-900";
export const RH_SHELL_ROOT = WS_CANVAS;
export const RH_SIDEBAR = WS_SIDEBAR;
export const RH_SIDEBAR_NAV_ACTIVE = WS_SIDEBAR_NAV_ACTIVE;
export const RH_BTN_PRIMARY = WS_BTN_PRIMARY;
export const RH_BTN_SECONDARY = WS_BTN_SECONDARY;
export const RH_INPUT = WS_INPUT;
export const RH_MODAL_OVERLAY = WS_MODAL_OVERLAY;
export const RH_AVATAR = WS_AVATAR;
export const RH_LINK = WS_LINK;
export const WS_MODAL_PANEL =
    "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900";
export const WS_MODAL_HEADER = "border-b border-slate-200 dark:border-slate-700";

export const RH_CARD = WS_CARD;
export const RH_MODAL_PANEL = WS_MODAL_PANEL;
export const RH_TEXT_PRIMARY = WS_TEXT_PRIMARY;
export const RH_TEXT_SECONDARY = WS_TEXT_SECONDARY;
export const RH_TEXT_MUTED = WS_TEXT_MUTED;
export const RH_FILTER_BAR = WS_FILTER_BAR;
export const RH_SELECT = WS_SELECT;
export const RH_SKILL_BADGE = WS_SKILL_BADGE;
export const RH_ALERT_ERROR = WS_ALERT_ERROR;
export const RH_ALERT_WARN = WS_ALERT_WARN;

/** En-tête workspace RH (topbar) */
export const RH_TOPBAR =
    "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
