/**
 * Helpers d’affichage projet — lecture des champs API uniquement (aucun calcul métier).
 */
import type { AnalysisRefreshPayload, Project } from "@/types/crud-domain";

export const normalizeProjectStatus = (raw: string | null | undefined): string => {
    const value = String(raw ?? "").trim().toLowerCase();
    if (!value) return "";
    if (value === "canceled") return "cancelled";
    if (value === "on_hold" || value === "on-hold" || value === "on hold") return "paused";
    return value;
};

export const getStatusTone = (status: string): string => {
    switch (normalizeProjectStatus(status)) {
        case "active":
            return "bg-success-primary/10 text-success-primary ring-success-primary/30";
        case "planned":
            return "bg-utility-brand-50 text-utility-brand-800 ring-utility-brand-300";
        case "paused":
            return "bg-warning-primary/10 text-warning-primary ring-warning-primary/30";
        case "completed":
            return "bg-success-primary/15 text-success-primary ring-success-primary/40";
        case "at-risk":
            return "bg-error-primary/10 text-error-primary ring-error-primary/30";
        case "cancelled":
            return "bg-fg-quaternary/10 text-fg-quaternary ring-fg-quaternary/30";
        default:
            return "bg-primary_alt text-secondary ring-secondary";
    }
};

export function getProjectField(row: Project, keys: string[]): unknown {
    const r = row as Record<string, unknown>;
    for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
}

export function formatLastUpdate(row: Project): string {
    const v = getProjectField(row, ["updatedAt", "updated_at", "lastModified", "last_modified_at", "modifiedAt"]);
    if (v == null) return "—";
    const d = new Date(typeof v === "number" || typeof v === "string" ? v : String(v));
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatPriority(row: Project): string {
    const p = getProjectField(row, ["priority", "Priority"]);
    if (p == null || p === "") return "—";
    return String(p);
}

export function formatScore(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number" && !Number.isNaN(value)) return String(value);
    const n = Number(value);
    if (!Number.isNaN(n)) return String(n);
    return "—";
}

/** Champs analytiques renvoyés par l’API — affichage brut, pas de recalcul. */
export function projectToAnalysisPayload(project: Project): AnalysisRefreshPayload | null {
    const out: AnalysisRefreshPayload = {};
    if (project.viability_score != null) out.viability_score = project.viability_score;
    if (project.risk_score != null) out.risk_score = project.risk_score;
    if (project.decision != null) out.decision = project.decision;
    return Object.keys(out).length ? out : null;
}

/** Compte les projets dont la décision serveur est « Stop » (texte API, comparaison de libellé uniquement). */
export function countDecisionStopProjects(projects: Project[]): number {
    return projects.filter((p) => String(p.decision ?? "").trim().toLowerCase() === "stop").length;
}

/** Couleurs pill (Badge) pour décision IA — Continue / Adjust / Stop. */
export function getDecisionBadgeColor(decision: string | null | undefined): "success" | "warning" | "error" | "gray" {
    const v = String(decision ?? "")
        .trim()
        .toLowerCase();
    if (v === "continue") return "success";
    if (v === "adjust") return "warning";
    if (v === "stop") return "error";
    return "gray";
}

export function getDecisionColorClass(decision: string | null | undefined): string {
    const v = String(decision ?? "").trim().toLowerCase();
    if (v === "continue") return "text-success-primary";
    if (v === "adjust") return "text-warning-primary";
    if (v === "stop") return "text-error-primary";
    return "text-tertiary";
}

export function getRiskColorClass(severity: string | null | undefined): string {
    const v = String(severity ?? "").trim().toLowerCase();
    if (v === "high") return "text-error-primary";
    if (v === "medium") return "text-warning-primary";
    if (v === "low") return "text-success-primary";
    return "text-tertiary";
}
