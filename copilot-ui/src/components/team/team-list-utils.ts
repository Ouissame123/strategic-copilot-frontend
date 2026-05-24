import type { TalentListItem } from "@/types/api.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeamSortKey = "name" | "allocation" | "ipi" | "contract" | "status" | "risk";
export type TeamStatusFilter = "all" | "green" | "orange" | "red";
export type TeamIpiFilter = "all" | "low" | "mid" | "high";

export function talentStableId(t: TalentListItem): string {
    const fromTid = String(t.talent_id ?? "").trim();
    if (fromTid) return fromTid;
    const fromId = String(t.id ?? "").trim();
    if (fromId) return fromId;
    const email = String(t.email ?? "").trim();
    if (email) return `email:${email}`;
    return `row:${t.full_name}`;
}

export function talentActionId(t: TalentListItem): string | null {
    const tid = String(t.talent_id ?? "").trim();
    if (UUID_RE.test(tid)) return tid;
    const id = String(t.id ?? "").trim();
    if (UUID_RE.test(id)) return id;
    return null;
}

export function displayProjectName(t: TalentListItem): string | null {
    const n = t.top_project?.name?.trim();
    if (n) return n;
    return t.primary_project_name?.trim() || null;
}

export function displayProjectStatus(t: TalentListItem): string | null {
    return t.top_project?.status?.trim() || t.project_status?.trim() || null;
}

export function displayRole(t: TalentListItem): string {
    return t.role?.trim() ? t.role.trim() : "Collaborateur";
}

export function clampAllocation(n: number): number {
    return Math.min(200, Math.max(0, Math.round(n)));
}

export function resolveTalentRiskLevel(t: TalentListItem): "low" | "medium" | "high" {
    const alloc = Number(t.total_allocation_pct ?? 0);
    const alerts = Number(t.active_alerts_count ?? 0);
    if (t.status_color === "red" || alloc >= 160 || alerts >= 3) return "high";
    if (t.status_color === "orange" || alloc >= 100 || alerts >= 1) return "medium";
    return "low";
}

export function truncateEmail(email: string, max = 28): string {
    if (email.length <= max) return email;
    const at = email.indexOf("@");
    if (at <= 0) return `${email.slice(0, max - 1)}…`;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    const keep = Math.max(4, max - domain.length - 1);
    return `${local.slice(0, keep)}…${domain}`;
}

export function sortToggle(
    current: TeamSortKey,
    key: TeamSortKey,
    dir: "asc" | "desc",
): { key: TeamSortKey; dir: "asc" | "desc" } {
    if (current !== key) {
        const defaultDir: "asc" | "desc" =
            key === "name" || key === "status" || key === "contract" ? "asc" : "desc";
        return { key, dir: defaultDir };
    }
    return { key, dir: dir === "asc" ? "desc" : "asc" };
}

export function compareNullableNum(a: number | null | undefined, b: number | null | undefined, dir: "asc" | "desc"): number {
    const av = a ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const bv = b ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    return dir === "asc" ? av - bv : bv - av;
}

export function matchesIpiFilter(t: TalentListItem, filter: TeamIpiFilter): boolean {
    if (filter === "all") return true;
    const score = t.insights?.ipi_score;
    if (score == null || !Number.isFinite(score)) return filter === "low";
    if (filter === "low") return score < 4;
    if (filter === "mid") return score >= 4 && score <= 7;
    return score > 7;
}

export function matchesStatusFilter(t: TalentListItem, filter: TeamStatusFilter): boolean {
    if (filter === "all") return true;
    return t.status_color === filter;
}
