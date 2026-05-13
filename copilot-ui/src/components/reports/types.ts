/**
 * Types partagés pour les composants Reports (drop-in page Rapports manager).
 */

export type ReportFormat = "pdf" | "csv" | "excel" | "print";

export type ReportType =
    | "board_pack"
    | "project_dossier"
    | "global_enterprise"
    | "hr_talents"
    | "risks_alerts"
    | "decisions_ai";

export type ReportStatus = "ready" | "generating" | "failed" | "archived";

export type ServiceStatus = "ok" | "degraded" | "down" | "unknown";

export type DecisionLabel = "Continue" | "Adjust" | "Stop";

export interface ReportTemplate {
    id: string;
    type: ReportType;
    title: string;
    description: string;
    dataSource: string;
    formats: ReportFormat[];
    primaryFormat: ReportFormat;
    isBackendGenerated: boolean;
    lastGeneratedAt?: string | null;
    generationCount?: number;
    estimatedPages?: number;
}

export interface ServiceHealth {
    name: string;
    label: string;
    status: ServiceStatus;
    latencyMs?: number | null;
    details?: string;
    lastCheckAt?: string | null;
    meta?: Record<string, string | number>;
}

export interface DecisionDistribution {
    continue: number;
    adjust: number;
    stop: number;
    unscored?: number;
}

export interface HealthTimelinePoint {
    date: string;
    score: number;
}

export interface FragileProject {
    id: string;
    name: string;
    score: number;
    decision: DecisionLabel;
}

export interface ReportHistoryItem {
    reportId: string;
    type: ReportType;
    format: ReportFormat;
    status: ReportStatus;
    fileUrl?: string | null;
    fileSize?: number | null;
    generatedAt: string;
    generatedBy?: string | null;
    projectName?: string | null;
    period?: string | null;
    language?: string | null;
}
