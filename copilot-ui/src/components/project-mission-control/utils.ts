import { fragilityToHealthDisplayScore, readProjectFragilityScore } from "@/lib/project-risk-kpi-meta";
import type { AlertItem, AssignmentItem, ProjectDetailResponse } from "@/types/api.types";
import type { MissionControlKpiData } from "./types";

export function normalizeId(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

export function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

export function toDateInputValue(iso: string | null | undefined): string {
    const s = String(iso ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (Number.isNaN(t)) return "";
    return new Date(t).toISOString().slice(0, 10);
}

export function formatRelativeSeconds(seconds: number, locale: string): string {
    if (seconds < 5) return locale.startsWith("en") ? "just now" : locale.startsWith("ar") ? "الآن" : "à l'instant";
    if (seconds < 60) return locale.startsWith("en") ? `${seconds}s ago` : locale.startsWith("ar") ? `منذ ${seconds} ث` : `il y a ${seconds} s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return locale.startsWith("en") ? `${mins}m ago` : locale.startsWith("ar") ? `منذ ${mins} د` : `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return locale.startsWith("en") ? `${hours}h ago` : locale.startsWith("ar") ? `منذ ${hours} س` : `il y a ${hours} h`;
}

export function formatDaysRemaining(milestoneAt: string | null | undefined, locale: string): { label: string; tone: "ok" | "warn" | "danger" | "overdue" } {
    if (!milestoneAt) return { label: "—", tone: "ok" };
    const end = Date.parse(milestoneAt);
    if (Number.isNaN(end)) return { label: "—", tone: "ok" };
    const days = Math.ceil((end - Date.now()) / 86_400_000);
    if (days < 0) {
        const abs = Math.abs(days);
        const label = locale.startsWith("en") ? `${abs}d overdue` : locale.startsWith("ar") ? `متأخر ${abs} ي` : `${abs} j dépassés`;
        return { label, tone: "overdue" };
    }
    const label = locale.startsWith("en") ? `${days}d left` : locale.startsWith("ar") ? `${days} ي متبقية` : `${days} j restants`;
    if (days < 7) return { label, tone: "danger" };
    if (days <= 30) return { label, tone: "warn" };
    return { label, tone: "ok" };
}

export function priorityBadgeClass(priority: number): string {
    if (priority <= 1) return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    if (priority === 2) return "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (priority === 3) return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    if (priority === 4) return "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200";
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300";
}

export function statusBadgeClass(status: string | null | undefined): string {
    const v = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (v === "active") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
    if (v === "paused" || v === "on_hold" || v === "onhold") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
    if (v === "cancelled") return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    if (v === "completed") return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200";
    if (v === "archived") return "border-slate-300 bg-slate-100 text-slate-600";
    return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100";
}

export function healthScoreColor(score: number | null | undefined): string {
    if (score == null || !Number.isFinite(score)) return "text-slate-500";
    if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    if (score >= 30) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
}

export function countAlertSeverities(alerts: AlertItem[]): { critical: number; high: number; medium: number; low: number } {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const a of alerts) {
        const s = String(a.severity ?? "").trim().toLowerCase();
        if (s === "critical" || s === "critique") critical += 1;
        else if (s === "high" || s === "élevé" || s === "eleve") high += 1;
        else if (s === "medium" || s === "moyen") medium += 1;
        else low += 1;
    }
    return { critical, high, medium, low };
}

export function computeTeamFte(assignments: AssignmentItem[]): number {
    const sum = assignments.reduce((acc, a) => {
        const n = Number(a.allocation_pct);
        return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return Math.round((sum / 100) * 10) / 10;
}

export function buildKpiData(detail: ProjectDetailResponse | undefined): MissionControlKpiData {
    const alerts = (detail?.active_alerts ?? []).filter((a) => String(a.status ?? "open").toLowerCase() !== "resolved");
    const sev = countAlertSeverities(alerts);
    const assignments = detail?.assignments ?? [];
    const fragility = readProjectFragilityScore(detail);
    const healthScore = fragility != null ? fragilityToHealthDisplayScore(fragility) : null;
    const viabilityRaw = detail?.latest_viability?.score;
    const viabilityScore = viabilityRaw != null && Number.isFinite(Number(viabilityRaw)) ? Number(viabilityRaw) : null;

    return {
        healthScore,
        viabilityScore,
        viabilityDecision: detail?.latest_viability?.decision ?? null,
        viabilityComputedAt: detail?.latest_viability?.computed_at ?? null,
        alertsTotal: alerts.length,
        alertsCritical: sev.critical,
        alertsHigh: sev.high,
        alertsMedium: sev.medium,
        teamCount: assignments.length,
        teamFte: computeTeamFte(assignments),
    };
}

export function looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export function pickTalentDisplayName(
    params: { talentName?: string; mappedName?: string; talentEmail?: string; talentId?: string },
    unknownTalent: string,
): string {
    const talentName = String(params.talentName ?? "").trim();
    const mappedName = String(params.mappedName ?? "").trim();
    const talentEmail = String(params.talentEmail ?? "").trim();
    const talentId = String(params.talentId ?? "").trim();
    if (talentName && !looksLikeUuid(talentName)) return talentName;
    if (mappedName) return mappedName;
    if (talentEmail) return talentEmail;
    if (talentId) return talentId;
    return unknownTalent;
}
