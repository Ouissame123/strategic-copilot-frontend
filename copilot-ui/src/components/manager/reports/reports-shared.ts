import type { ReportFormat, ReportType } from "@/components/reports/types";

export const REPORT_CARD =
    "rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90";

export const DISPLAY_FORMATS: ReportFormat[] = ["pdf", "csv", "excel"];

export const FAVORITES_STORAGE_KEY = "manager-report-template-favorites-v1";

export type ReportAudience = "all" | "direction" | "rh" | "project" | "risks";

export const AUDIENCE_BY_TEMPLATE: Record<string, ReportAudience> = {
    board_pack: "direction",
    global_enterprise: "direction",
    project_detail: "project",
    rh_talents: "rh",
    risks_alerts: "risks",
    decisions_ai: "risks",
};

export function templateMatchesAudience(templateId: string, audience: ReportAudience): boolean {
    if (audience === "all") return true;
    return AUDIENCE_BY_TEMPLATE[templateId] === audience;
}

export type MockSchedule = {
    id: string;
    name: string;
    frequency: string;
    recipients: string;
    active: boolean;
    lastSent: string;
    nextSent: string;
    reportType: ReportType;
};

export const MOCK_SCHEDULES: MockSchedule[] = [
    {
        id: "1",
        name: "Weekly Executive Pack",
        frequency: "Chaque lundi · 08:00",
        recipients: "comite@entreprise.com",
        active: true,
        lastSent: "il y a 2 h",
        nextSent: "lundi 08:00",
        reportType: "board_pack",
    },
    {
        id: "2",
        name: "Monthly RH Summary",
        frequency: "1er du mois · 09:00",
        recipients: "rh@entreprise.com",
        active: true,
        lastSent: "il y a 3 j",
        nextSent: "1er avr. 09:00",
        reportType: "hr_talents",
    },
    {
        id: "3",
        name: "Risk Alert Digest",
        frequency: "Chaque vendredi · 17:00",
        recipients: "risques@entreprise.com",
        active: true,
        lastSent: "hier",
        nextSent: "ven. 17:00",
        reportType: "risks_alerts",
    },
];
