export const PROFILE_CARD =
    "rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80";

export const PROFILE_INPUT =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const PROFILE_LABEL = "text-xs font-medium text-slate-600 dark:text-slate-400";

export type ProfileTabId = "account" | "security" | "notifications" | "ai";

export const MANAGER_ACTIVITY_STATS = {
    projectsManaged: 14,
    teamTalents: 12,
    decisionsThisMonth: 23,
    alertsHandled: 8,
    lastLoginLabel: "il y a 2 h",
} as const;

export function initialsFromName(name: string, email: string): string {
    const n = name.trim();
    if (n) {
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
        return n.slice(0, 2).toUpperCase();
    }
    return (email.charAt(0) || "?").toUpperCase();
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const MANAGER_COMPANY_FALLBACK = "Iberian Data Solution";

export const PROFILE_TIMEZONES = [
    { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
    { value: "Europe/London", label: "Europe/London (UTC+0/+1)" },
    { value: "Europe/Madrid", label: "Europe/Madrid (UTC+1/+2)" },
    { value: "America/New_York", label: "America/New_York (UTC-5/-4)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (UTC+4)" },
] as const;

export const MANAGER_NOTIF_MATRIX_KEY = "manager-profile-notif-matrix-v1";
export const MANAGER_AI_PREFS_KEY = "manager-profile-ai-prefs-v1";
export const MANAGER_ACCOUNT_PREFS_KEY = "manager-profile-account-prefs-v1";

export type ManagerAccountPrefs = {
    language: "fr" | "en" | "es";
    timezone: string;
};

export type ManagerAiPrefs = {
    copilotEnabled: boolean;
    proactiveMode: boolean;
    responseLanguage: "fr" | "en" | "es";
    detailLevel: "synthesis" | "detailed" | "expert";
};

export const DEFAULT_NOTIF_MATRIX_ROWS = [
    { id: "critical", label: "Alertes critiques", email: true, inApp: true, slack: true },
    { id: "ai-decisions", label: "Décisions IA", email: true, inApp: true, slack: false, slackDisabled: true },
    { id: "rh", label: "Demandes RH", email: true, inApp: true, slack: false, slackDisabled: true },
    { id: "weekly", label: "Rapports hebdo", email: true, inApp: false, slack: false, slackDisabled: true },
] as const;

export const DEFAULT_AI_PREFS: ManagerAiPrefs = {
    copilotEnabled: true,
    proactiveMode: false,
    responseLanguage: "fr",
    detailLevel: "detailed",
};

export function passwordStrengthUi(password: string): { score: number; label: string; barClass: string } {
    if (!password) return { score: 0, label: "—", barClass: "bg-slate-200 dark:bg-slate-700" };
    let score = 0;
    if (password.length >= 8) score += 22;
    if (password.length >= 12) score += 12;
    if (/[a-z]/.test(password)) score += 14;
    if (/[A-Z]/.test(password)) score += 14;
    if (/\d/.test(password)) score += 14;
    if (/[^A-Za-z0-9]/.test(password)) score += 14;
    score = Math.min(100, score);
    if (score < 40) return { score, label: "Faible", barClass: "bg-rose-500" };
    if (score < 70) return { score, label: "Correct", barClass: "bg-amber-500" };
    return { score, label: "Robuste", barClass: "bg-emerald-500" };
}
