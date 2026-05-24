import type { ReportAudience } from "./reports-shared";

export type AutomationFrequency = "weekly" | "monthly" | "daily";

export type AutomationTemplateKey =
    | "board_pack"
    | "project_dossier"
    | "risks_alerts"
    | "hr_talents"
    | "global_enterprise"
    | "decisions_ai";

export type ReportAutomation = {
    id: string;
    title: string;
    templateKey: AutomationTemplateKey;
    audience: Exclude<ReportAudience, "all">;
    audienceLabel: string;
    recipients: string[];
    frequency: AutomationFrequency;
    /** 0 = dimanche … 6 = samedi */
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    language: "fr" | "en";
    format: "pdf" | "csv" | "xlsx";
    active: boolean;
    lastSentLabel: string;
    nextSentLabel: string;
};

export const AUTOMATIONS_STORAGE_KEY = "manager-report-automations-v1";

/** Anciens IDs démo — retirés au chargement pour ne pas afficher de fausses planifications. */
const LEGACY_MOCK_AUTOMATION_IDS = new Set(["auto-board", "auto-risks", "auto-rh"]);

function stripLegacyMockAutomations(list: ReportAutomation[]): ReportAutomation[] {
    if (!list.length) return [];
    const allLegacy = list.every((a) => LEGACY_MOCK_AUTOMATION_IDS.has(a.id));
    if (allLegacy) return [];
    return list.filter((a) => !LEGACY_MOCK_AUTOMATION_IDS.has(a.id));
}

export type CalendarDayEvent = {
    automationId: string;
    title: string;
    time: string;
    color: string;
};

const DOT_COLORS: Record<AutomationTemplateKey, string> = {
    board_pack: "#6366f1",
    project_dossier: "#8b5cf6",
    risks_alerts: "#f59e0b",
    hr_talents: "#10b981",
    global_enterprise: "#3b82f6",
    decisions_ai: "#ec4899",
};

export function dotColorForTemplate(key: AutomationTemplateKey): string {
    return DOT_COLORS[key] ?? "#6366f1";
}

export function automationMatchesDate(auto: ReportAutomation, date: Date): boolean {
    if (!auto.active) return false;
    if (auto.frequency === "daily") return true;
    if (auto.frequency === "weekly") return auto.dayOfWeek === date.getDay();
    if (auto.frequency === "monthly") return (auto.dayOfMonth ?? 1) === date.getDate();
    return false;
}

export function eventsForDate(date: Date, automations: ReportAutomation[]): CalendarDayEvent[] {
    return automations
        .filter((a) => automationMatchesDate(a, date))
        .map((a) => ({
            automationId: a.id,
            title: a.title,
            time: a.time,
            color: dotColorForTemplate(a.templateKey),
        }));
}

export function recipientCount(recipients: string[]): number {
    return recipients.filter((r) => r.trim().includes("@")).length;
}

export function frequencyLabel(auto: ReportAutomation): string {
    const [h, m] = auto.time.split(":");
    const timeStr = `${h}h${m !== "00" ? m : ""}`;
    if (auto.frequency === "daily") return `Quotidien · ${timeStr}`;
    if (auto.frequency === "weekly") {
        const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        return `Tous les ${days[auto.dayOfWeek ?? 1]}s · ${timeStr}`;
    }
    return `${auto.dayOfMonth ?? 1}er du mois · ${timeStr}`;
}

export function loadAutomations(): ReportAutomation[] {
    try {
        const raw = localStorage.getItem(AUTOMATIONS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ReportAutomation[];
        if (!Array.isArray(parsed)) return [];
        const cleaned = stripLegacyMockAutomations(parsed);
        if (cleaned.length !== parsed.length) {
            saveAutomations(cleaned);
        }
        return cleaned;
    } catch {
        return [];
    }
}

export function saveAutomations(list: ReportAutomation[]) {
    localStorage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(list));
}

export function mapTemplateToApiType(key: AutomationTemplateKey): "board_pack" | "project_dossier" | null {
    if (key === "board_pack" || key === "global_enterprise" || key === "decisions_ai") return "board_pack";
    if (key === "project_dossier") return "project_dossier";
    return null;
}

export function mapFrequencyToApi(freq: AutomationFrequency): "weekly" | "monthly" {
    return freq === "monthly" ? "monthly" : "weekly";
}
