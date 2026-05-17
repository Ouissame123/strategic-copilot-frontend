import type { ProjectRiskItem } from "@/types/api.types";

export function formatRiskCodeLabel(code: string): string {
    return code
        .trim()
        .replace(/[-.]+/g, "_")
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

export function projectRiskSeverityRank(severity: string | undefined): number {
    const v = (severity ?? "").trim().toLowerCase();
    if (v === "critical") return 4;
    if (v === "high") return 3;
    if (v === "medium") return 2;
    if (v === "low") return 1;
    return 0;
}

export function sortProjectRisksBySeverity(risks: ProjectRiskItem[]): ProjectRiskItem[] {
    return [...risks].sort((a, b) => {
        const rank = projectRiskSeverityRank(b.severity) - projectRiskSeverityRank(a.severity);
        if (rank !== 0) return rank;
        const sb = b.score ?? -1;
        const sa = a.score ?? -1;
        return sb - sa;
    });
}

export function projectRiskSeverityBadgeClass(severity: string | undefined): string {
    const v = (severity ?? "").trim().toLowerCase();
    if (v === "critical") return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
    if (v === "high") return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (v === "medium") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
}

export function projectRiskTitle(risk: ProjectRiskItem): string {
    const title = risk.title?.trim();
    if (title) return title;
    return formatRiskCodeLabel(risk.risk_code);
}

export function formatProjectRiskScore(score: number | null | undefined): string | null {
    if (score == null || !Number.isFinite(score)) return null;
    const n = Number(score);
    const display = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${display}/10`;
}

export function normalizeRisksFromApiPayload(raw: unknown): ProjectRiskItem[] {
    if (!raw || typeof raw !== "object") return [];
    const bag = raw as Record<string, unknown>;
    const list = bag.risks ?? bag.items ?? bag.alerts;
    if (!Array.isArray(list)) return [];

    return list
        .map((item, index) => {
            const row = item != null && typeof item === "object" ? (item as Record<string, unknown>) : null;
            if (!row) return null;

            const risk_code = String(row.risk_code ?? row.code ?? row.category ?? "").trim();
            const id = String(row.id ?? row.alert_id ?? row.risk_id ?? risk_code ?? `risk-${index}`).trim();
            if (!id && !risk_code) return null;

            const titleRaw = row.title ?? row.label;
            const title = titleRaw != null && String(titleRaw).trim() !== "" ? String(titleRaw).trim() : null;

            const descRaw = row.description ?? row.message;
            const description = descRaw != null && String(descRaw).trim() !== "" ? String(descRaw).trim() : null;

            const scoreRaw = row.score ?? row.risk_score;
            const scoreNum = scoreRaw != null ? Number(scoreRaw) : NaN;
            const score = Number.isFinite(scoreNum) ? scoreNum : null;

            return {
                id,
                severity: String(row.severity ?? "medium").trim().toLowerCase(),
                risk_code: risk_code || id,
                title,
                description,
                score,
            } satisfies ProjectRiskItem;
        })
        .filter((r): r is ProjectRiskItem => r != null);
}
