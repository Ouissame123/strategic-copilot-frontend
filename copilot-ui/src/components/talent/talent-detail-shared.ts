import type { AlertItem, TalentDetailResponse } from "@/types/api.types";

export const TALENT_CARD =
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";

export const TALENT_PAGE_BG =
    "min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900";

export const TALENT_LABEL = "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export const TALENT_TITLE = "text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100";

export function formatTalentDate(iso: string | null | undefined): string {
    if (iso == null || String(iso).trim() === "") return "";
    const d = new Date(String(iso));
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function talentInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function assignmentPeriodLabel(a: {
    start_date?: string | null;
    end_date?: string | null;
}): string {
    if (a.start_date && a.end_date) {
        return `${formatTalentDate(a.start_date)} → ${formatTalentDate(a.end_date)}`;
    }
    if (a.start_date) return `Depuis ${formatTalentDate(a.start_date)}`;
    return "Affectation en cours";
}

export function assignmentRoleLabel(role?: string | null): string {
    return role?.trim() ? role.trim() : "Membre équipe";
}

export type TalentDetailData = TalentDetailResponse;

export type TalentAssignment = TalentDetailResponse["active_assignments"][number];

export type TalentSkill = TalentDetailResponse["skills"][number];

export type TalentAlert = AlertItem;

/** Tolère les alias / enveloppes de réponse détail talent (sans filtrer par statut). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTalentAlerts(detail: any): any[] {
    const list =
        detail?.active_alerts ??
        detail?.data?.active_alerts ??
        detail?.talent?.active_alerts ??
        detail?.alerts ??
        detail?.risk_alerts ??
        [];
    return Array.isArray(list) ? list : [];
}

export function cleanAlertMessage(message?: string | null): string {
    if (!message) return "";
    return message
        .replace(/\s*\[ignore by [^\]]+\]/gi, "")
        .replace(/\s*\[ignored by [^\]]+\]/gi, "")
        .replace(/\s*\[ignorée par [^\]]+\]/gi, "")
        .trim();
}

export function mapTalentAlertForDisplay(alert: unknown): TalentAlert {
    const row = alert != null && typeof alert === "object" ? (alert as Record<string, unknown>) : {};
    const rawMessage = row.message == null ? undefined : String(row.message);
    const cleaned = cleanAlertMessage(rawMessage);
    return {
        id: String(row.id ?? row.alert_id ?? ""),
        severity: String(row.severity ?? "medium"),
        title: String(row.title ?? rawMessage ?? "Alerte"),
        status: row.status == null ? undefined : String(row.status),
        message: cleaned || rawMessage || String(row.title ?? "Alerte"),
        project_id: row.project_id == null ? undefined : String(row.project_id),
        risk_type: row.risk_type == null ? undefined : String(row.risk_type),
        category: row.category == null ? undefined : String(row.category),
        risk_score: row.risk_score == null ? undefined : Number(row.risk_score),
        detected_at: row.detected_at == null ? undefined : String(row.detected_at),
        impact_area: row.impact_area == null ? undefined : String(row.impact_area),
    };
}

export function parseAnalyst(data: TalentDetailResponse | undefined) {
    const analyst = (data?.analyst ?? {}) as {
        nine_box?: {
            performance_score?: number;
            potential_score?: number;
            box_label?: string;
            rationale?: string | null;
            computed_at?: string;
        } | null;
        ipi?: {
            ipi_score?: number;
            tech_score?: number;
            exp_score?: number;
            stability_score?: number;
            band?: string;
            ipi_band?: string;
            computed_at?: string;
        } | null;
        mobility?: {
            mobility_flag?: string;
            mobility_score?: number;
            drivers?: Array<string | { key: string; value: string | number }> | null;
            computed_at?: string;
            total_skills?: number;
        } | null;
    };

    const nineBoxRaw = analyst.nine_box;
    const nine_box =
        nineBoxRaw &&
        typeof nineBoxRaw.performance_score === "number" &&
        typeof nineBoxRaw.potential_score === "number"
            ? {
                  performance_score: nineBoxRaw.performance_score,
                  potential_score: nineBoxRaw.potential_score,
                  box_label: String(nineBoxRaw.box_label ?? "—"),
                  rationale: nineBoxRaw.rationale ?? null,
                  computed_at: String(nineBoxRaw.computed_at ?? ""),
              }
            : null;

    const ipiRaw = analyst.ipi;
    const ipi =
        ipiRaw && typeof ipiRaw.ipi_score === "number"
            ? {
                  ipi_score: ipiRaw.ipi_score,
                  tech_score: Number(ipiRaw.tech_score ?? 0),
                  exp_score: Number(ipiRaw.exp_score ?? 0),
                  stability_score: Number(ipiRaw.stability_score ?? 0),
                  band: String(ipiRaw.band ?? ipiRaw.ipi_band ?? "average"),
                  computed_at: String(ipiRaw.computed_at ?? ""),
              }
            : null;

    const mobRaw = analyst.mobility;
    const totalSkillsFromMobility =
        mobRaw && typeof mobRaw.total_skills === "number" && Number.isFinite(mobRaw.total_skills)
            ? mobRaw.total_skills
            : null;
    const totalSkillsFromSummary =
        typeof data?.summary?.skills_count === "number" && Number.isFinite(data.summary.skills_count)
            ? data.summary.skills_count
            : null;
    const totalSkillsFromList = Array.isArray(data?.skills) && data.skills.length > 0 ? data.skills.length : null;
    const total_skills = totalSkillsFromMobility ?? totalSkillsFromSummary ?? totalSkillsFromList;

    const mobility =
        mobRaw && typeof mobRaw.mobility_score === "number"
            ? {
                  mobility_flag: String(mobRaw.mobility_flag ?? "stable"),
                  mobility_score: mobRaw.mobility_score,
                  drivers: mobRaw.drivers ?? null,
                  computed_at: String(mobRaw.computed_at ?? ""),
                  total_skills: total_skills ?? null,
              }
            : null;

    return { nine_box, ipi, mobility };
}

export function riskLevelStyles(level: string | undefined): { badge: string; label: string } {
    const l = (level ?? "low").toLowerCase();
    if (l === "high") {
        return {
            badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800",
            label: "Risque élevé",
        };
    }
    if (l === "medium") {
        return {
            badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
            label: "À surveiller",
        };
    }
    return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
        label: "Stable",
    };
}
