import type {
    DashboardDeadlineUrgency,
    DashboardPortfolio,
    DashboardPortfolioByStatus,
    DashboardPortfolioBudget,
    DashboardPortfolioDeadlines,
    DashboardProjectRow,
    DashboardRequirementsFactual,
    DashboardTasksFactual,
    DashboardTeamFactual,
    ManagerDashboardV4Response,
} from "@/features/manager/types/dashboard-v4";
import { asRecord, firstArray, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function num(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ""): string {
    if (value == null) return fallback;
    return String(value);
}

function mapByStatus(raw: unknown): DashboardPortfolioByStatus {
    const row = asRecord(raw);
    return {
        active: num(row.active),
        planned: num(row.planned),
        on_hold: num(row.on_hold),
        completed: num(row.completed),
    };
}

function mapBudget(raw: unknown): DashboardPortfolioBudget {
    const row = asRecord(raw);
    return {
        planned_total: num(row.planned_total),
        actual_total: num(row.actual_total),
        consumed_pct: num(row.consumed_pct),
    };
}

function mapDeadlines(raw: unknown): DashboardPortfolioDeadlines {
    const row = asRecord(raw);
    return {
        overdue: num(row.overdue),
        urgent: num(row.urgent),
        warning: num(row.warning),
    };
}

function mapPortfolio(raw: unknown): DashboardPortfolio {
    const row = asRecord(raw);
    return {
        total_projects: num(row.total_projects),
        by_status: mapByStatus(row.by_status),
        budget: mapBudget(row.budget),
        deadlines: mapDeadlines(row.deadlines),
    };
}

function mapTeam(raw: unknown): DashboardTeamFactual {
    const row = asRecord(raw);
    const hasPoolFields =
        row.total_pool != null || row.assigned != null || row.unassigned != null;
    const legacyTotal = num(row.total);
    const total_pool = hasPoolFields ? num(row.total_pool, legacyTotal) : legacyTotal;
    const assigned = hasPoolFields ? num(row.assigned) : 0;
    const unassigned = hasPoolFields
        ? num(row.unassigned, Math.max(0, total_pool - assigned))
        : 0;
    return {
        total_pool,
        assigned,
        unassigned,
        underloaded: num(row.underloaded),
        balanced: num(row.balanced),
        overloaded: num(row.overloaded),
        contracts_ending_90d: num(row.contracts_ending_90d),
    };
}

function mapTasks(raw: unknown): DashboardTasksFactual {
    const row = asRecord(raw);
    return {
        total: num(row.total),
        done: num(row.done),
        in_progress: num(row.in_progress),
        todo: num(row.todo),
        critical: num(row.critical),
        completion_pct: num(row.completion_pct),
    };
}

function mapRequirements(raw: unknown): DashboardRequirementsFactual {
    const row = asRecord(raw);
    return {
        total: num(row.total),
        mandatory: num(row.mandatory),
    };
}

function mapUrgency(raw: unknown): DashboardDeadlineUrgency | null {
    const v = str(raw).trim().toLowerCase();
    if (v === "overdue" || v === "urgent" || v === "warning" || v === "ok" || v === "none") return v;
    return null;
}

function mapProject(raw: unknown): DashboardProjectRow | null {
    const row = asRecord(raw);
    const id = str(row.id).trim();
    if (!id) return null;
    const capacityRaw = row.capacity_load_pct;
    const capacity =
        capacityRaw == null || capacityRaw === ""
            ? null
            : Number.isFinite(Number(capacityRaw))
              ? Number(capacityRaw)
              : null;
    return {
        id,
        name: str(row.name),
        status: str(row.status, "planned"),
        status_label: str(row.status_label),
        priority: num(row.priority, 3),
        milestone_at: row.milestone_at == null || row.milestone_at === "" ? null : str(row.milestone_at),
        team_size: num(row.team_size),
        capacity_load_pct: capacity,
        deadline_urgency: mapUrgency(row.deadline_urgency),
    };
}

function pushCandidate(out: Record<string, unknown>[], value: unknown): void {
    if (value == null) return;
    if (Array.isArray(value)) {
        for (const item of value) pushCandidate(out, item);
        return;
    }
    if (typeof value === "object") {
        const row = asRecord(value);
        out.push(row);
        // n8n item wrapper `{ json: { ...payload } }`
        if (row.json != null && typeof row.json === "object" && !Array.isArray(row.json)) {
            out.push(asRecord(row.json));
        }
    }
}

/**
 * Choisit la racine v4_factual : priorise tout objet qui contient `portfolio`.
 * Évite le piège `unwrapN8nRoot` → `data[0]` sans portfolio (zéros partout).
 */
export function pickV4DashboardRoot(raw: unknown): Record<string, unknown> {
    const candidates: Record<string, unknown>[] = [];
    pushCandidate(candidates, raw);
    const top = asRecord(raw);
    pushCandidate(candidates, top.data);
    pushCandidate(candidates, top.json);
    pushCandidate(candidates, asRecord(top.data).json);

    const withPortfolio = candidates.find(
        (c) => c.portfolio != null && typeof c.portfolio === "object" && !Array.isArray(c.portfolio),
    );
    if (withPortfolio) return withPortfolio;

    const withApiVersion = candidates.find((c) =>
        String(c.api_version ?? asRecord(c.meta).api_version)
            .toLowerCase()
            .includes("v4"),
    );
    if (withApiVersion) return withApiVersion;

    return unwrapN8nRoot(raw);
}

export function isV4FactualDashboardRoot(root: Record<string, unknown>): boolean {
    return root.portfolio != null && typeof root.portfolio === "object" && !Array.isArray(root.portfolio);
}

/** Normalise GET `/webhook/manager/dashboard` → contrat v4_factual (présentation uniquement). */
export function normalizeManagerDashboardV4Response(raw: unknown): ManagerDashboardV4Response {
    const root = pickV4DashboardRoot(raw);
    const computedAt = str(root.computed_at || asRecord(root.meta).computed_at);
    const projects = firstArray(root, ["projects"])
        .map(mapProject)
        .filter((p): p is DashboardProjectRow => p != null);

    return {
        status: str(root.status, "success"),
        workflow: str(root.workflow, "WF_Manager_Dashboard"),
        api_version: str(root.api_version || asRecord(root.meta).api_version, "v4_factual"),
        enterprise_id: str(root.enterprise_id),
        role: str(root.role, "manager"),
        scope: str(root.scope, "mine"),
        computed_at: computedAt,
        portfolio: mapPortfolio(root.portfolio),
        team: mapTeam(root.team),
        tasks: mapTasks(root.tasks),
        requirements: mapRequirements(root.requirements),
        projects,
        meta: {
            api_version: str(asRecord(root.meta).api_version || root.api_version, "v4_factual"),
            source_agent: str(asRecord(root.meta).source_agent, "manager_dashboard"),
            computed_at: str(asRecord(root.meta).computed_at || computedAt),
        },
    };
}
