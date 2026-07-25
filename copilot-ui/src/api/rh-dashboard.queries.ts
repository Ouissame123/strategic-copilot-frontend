/**
 * RH Dashboard cockpit — lectures CQRS-lite (Supabase SELECT only).
 * Aucun salaire individuel exposé : agrégats uniquement.
 * Agrégations temporelles (semaines / jours) faites côté client après fetch
 * (supabase-js ne fournit pas date_trunc/GROUP BY SQL natif sans RPC).
 */
import { supabase } from "@/lib/supabaseClient";

// ─── Errors & client ───────────────────────────────────────────────────────

export class RhDashboardQueryError extends Error {
    constructor(
        message: string,
        readonly cause?: unknown,
    ) {
        super(message);
        this.name = "RhDashboardQueryError";
    }
}

function requireSupabase() {
    if (!supabase) {
        throw new RhDashboardQueryError(
            "Client Supabase indisponible (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
        );
    }
    return supabase;
}

function assertEnterpriseId(enterpriseId: string): string {
    const eid = enterpriseId.trim();
    if (!eid) throw new RhDashboardQueryError("Identifiant entreprise manquant.");
    return eid;
}

function throwFromPostgrest(context: string, error: { message?: string } | null): never {
    throw new RhDashboardQueryError(`${context} : ${error?.message ?? "erreur inconnue"}`, error);
}

// ─── Normalization (casse / doublons Junior|junior) ─────────────────────────

/** Normalise un label avant agrégation : LOWER(TRIM()), vide → « non défini ». */
export function normalizeDashboardLabel(raw: string | null | undefined): string {
    const v = String(raw ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    return v || "non défini";
}

/** Libellé d’affichage FR à partir d’une clé normalisée. */
export function displayDashboardLabel(normalizedKey: string): string {
    if (normalizedKey === "non défini") return "Non défini";
    return normalizedKey.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Lundi 00:00 UTC de la semaine ISO-like (lundi = début). */
export function startOfWeekUtc(d: Date): Date {
    const day = startOfUtcDay(d);
    const dow = day.getUTCDay(); // 0=dim … 6=sam
    const diff = dow === 0 ? -6 : 1 - dow;
    day.setUTCDate(day.getUTCDate() + diff);
    return day;
}

function weeksAgoUtc(n: number): Date {
    const d = startOfWeekUtc(new Date());
    d.setUTCDate(d.getUTCDate() - n * 7);
    return d;
}

function monthsAgoUtc(n: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function weekKey(d: Date): string {
    return isoDate(startOfWeekUtc(d));
}

function parseDate(raw: string | null | undefined): Date | null {
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? new Date(t) : null;
}

function num(v: unknown): number {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
    return v == null ? "" : String(v).trim();
}

function talentDisplayName(row: {
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    full_name?: string | null;
}): string {
    const composed = `${str(row.first_name)} ${str(row.last_name)}`.trim();
    return composed || str(row.name) || str(row.full_name) || "Talent";
}

// ─── Query keys (TanStack) ─────────────────────────────────────────────────

export const rhDashboardQueryKeys = {
    all: ["rh", "dashboard-cockpit"] as const,
    headcount: (enterpriseId: string) => [...rhDashboardQueryKeys.all, "headcount", enterpriseId] as const,
    payrollAggregate: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "payroll-aggregate", enterpriseId] as const,
    budgetRhTotals: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "budget-rh-totals", enterpriseId] as const,
    openRequestsStats: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "open-requests-stats", enterpriseId] as const,
    workloadTrend8w: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "workload-trend-8w", enterpriseId] as const,
    budgetCostTrend: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "budget-cost-trend", enterpriseId] as const,
    requestsFlow6w: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "requests-flow-6w", enterpriseId] as const,
    nineBoxScatter: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "nine-box-scatter", enterpriseId] as const,
    ipiBandDistribution: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "ipi-band-distribution", enterpriseId] as const,
    payrollBySeniority: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "payroll-by-seniority", enterpriseId] as const,
    skillDemand: (enterpriseId: string) =>
        [...rhDashboardQueryKeys.all, "skill-demand", enterpriseId] as const,
} as const;

export const RH_DASHBOARD_STALE_MS = 60_000;

// ─── Types (agrégats publics — jamais de salaire individuel) ────────────────

export type RhHeadcountStats = {
    total: number;
    /** Delta effectif vs début du mois précédent (via talents.created_at). */
    deltaVsPrevMonth: number;
};

export type RhPayrollAggregate = {
    /** Masse salariale mensuelle (somme des salaires renseignés). */
    totalMonthlyPayroll: number;
    talentsWithSalary: number;
};

export type RhBudgetRhTotals = {
    planned: number;
    actual: number;
    /** 0–100 */
    consumptionPct: number;
    currency: string;
};

export type RhOpenRequestsStats = {
    openCount: number;
    /** Âge moyen en jours des demandes ouvertes. */
    avgAgeDays: number;
};

export type RhWorkloadWeekPoint = {
    weekStart: string;
    allocated: number;
    capacity: number;
};

export type RhBudgetCostDayPoint = {
    day: string;
    totalActual: number;
};

export type RhRequestsFlowWeekPoint = {
    weekStart: string;
    created: number;
    decided: number;
};

export type RhNineBoxScatterPoint = {
    talentId: string;
    name: string;
    performance: number;
    potential: number;
    boxLabel: string;
};

export type RhIpiBandCount = {
    /** Clé normalisée (top|strong|average|at_risk|…). */
    band: string;
    count: number;
};

export type RhPayrollBySeniorityRow = {
    /** Clé normalisée. */
    seniorityKey: string;
    /** Libellé affichage. */
    seniorityLabel: string;
    /** Masse salariale agrégée (jamais unitaire). */
    totalPayroll: number;
    headcount: number;
};

export type RhSkillDemandRow = {
    skillKey: string;
    skillLabel: string;
    projectsRequiring: number;
};

// ─── 1. Effectif + delta ───────────────────────────────────────────────────

export async function fetchRhHeadcountStats(enterpriseId: string): Promise<RhHeadcountStats> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();
    const prevMonthStart = monthsAgoUtc(1);

    const { count: total, error: errTotal } = await client
        .from("talents")
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", eid);

    if (errTotal) throwFromPostgrest("Effectif talents", errTotal);

    const { count: createdSincePrevMonth, error: errDelta } = await client
        .from("talents")
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", eid)
        .gte("created_at", prevMonthStart.toISOString());

    if (errDelta) throwFromPostgrest("Delta effectif", errDelta);

    const totalN = total ?? 0;
    const since = createdSincePrevMonth ?? 0;
    // Approximation : effectif début période ≈ total − créations depuis début mois précédent
    const deltaVsPrevMonth = since;

    return { total: totalN, deltaVsPrevMonth };
}

// ─── 2. Masse salariale (agrégat) ──────────────────────────────────────────

/**
 * Somme des salaires — aucune ligne individuelle retournée.
 * Table : talent_employment (salary) filtrée via talents.enterprise_id.
 */
export async function fetchRhPayrollAggregate(enterpriseId: string): Promise<RhPayrollAggregate> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    // Join embarqué : n’expose que salary (agrégé immédiatement).
    const { data, error } = await client
        .from("talent_employment")
        .select("salary, talents!inner(enterprise_id)")
        .eq("talents.enterprise_id", eid)
        .not("salary", "is", null);

    if (error) throwFromPostgrest("Masse salariale", error);

    let totalMonthlyPayroll = 0;
    let talentsWithSalary = 0;
    for (const row of data ?? []) {
        const salary = num((row as { salary?: unknown }).salary);
        if (salary <= 0) continue;
        totalMonthlyPayroll += salary;
        talentsWithSalary += 1;
    }

    return { totalMonthlyPayroll, talentsWithSalary };
}

// ─── 3. Budget RH projets (consommé vs planifié) ───────────────────────────

export async function fetchRhBudgetRhTotals(enterpriseId: string): Promise<RhBudgetRhTotals> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("projects")
        .select("budget_rh_planned, budget_rh_actual, currency")
        .eq("enterprise_id", eid);

    if (error) throwFromPostgrest("Budget RH projets", error);

    let planned = 0;
    let actual = 0;
    let currency = "EUR";
    for (const row of data ?? []) {
        planned += num((row as { budget_rh_planned?: unknown }).budget_rh_planned);
        actual += num((row as { budget_rh_actual?: unknown }).budget_rh_actual);
        const c = str((row as { currency?: unknown }).currency);
        if (c) currency = c;
    }

    const consumptionPct = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : 0;
    return { planned, actual, consumptionPct, currency };
}

// ─── 4. Demandes ouvertes + âge moyen ────────────────────────────────────

const OPEN_REQUEST_STATUSES = ["pending", "in_progress", "transferred_to_hr", "transferred_rh"] as const;

export async function fetchRhOpenRequestsStats(enterpriseId: string): Promise<RhOpenRequestsStats> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("talent_requests")
        .select("created_at, status")
        .eq("enterprise_id", eid)
        .in("status", [...OPEN_REQUEST_STATUSES]);

    if (error) throwFromPostgrest("Demandes ouvertes", error);

    const now = Date.now();
    let ageSum = 0;
    let openCount = 0;
    for (const row of data ?? []) {
        const created = parseDate((row as { created_at?: string }).created_at);
        if (!created) continue;
        openCount += 1;
        ageSum += (now - created.getTime()) / (1000 * 60 * 60 * 24);
    }

    return {
        openCount,
        avgAgeDays: openCount > 0 ? Math.round((ageSum / openCount) * 10) / 10 : 0,
    };
}

// ─── 5. Tendance charge vs capacité (8 semaines) ────────────────────────────

export async function fetchRhWorkloadTrend8w(enterpriseId: string): Promise<RhWorkloadWeekPoint[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();
    const from = weeksAgoUtc(8);

    const { data, error } = await client
        .from("workload_snapshots")
        .select("snapshot_date, hours_allocated, capacity_hours")
        .eq("enterprise_id", eid)
        .gte("snapshot_date", isoDate(from))
        .order("snapshot_date", { ascending: true });

    if (error) throwFromPostgrest("Tendance charge / capacité", error);

    const buckets = new Map<string, { allocated: number; capacity: number }>();
    for (const row of data ?? []) {
        const d = parseDate((row as { snapshot_date?: string }).snapshot_date);
        if (!d) continue;
        const key = weekKey(d);
        const cur = buckets.get(key) ?? { allocated: 0, capacity: 0 };
        cur.allocated += num((row as { hours_allocated?: unknown }).hours_allocated);
        cur.capacity += num((row as { capacity_hours?: unknown }).capacity_hours);
        buckets.set(key, cur);
    }

    // Série continue 8 semaines (zéros si semaine sans snapshot).
    const points: RhWorkloadWeekPoint[] = [];
    for (let i = 7; i >= 0; i -= 1) {
        const w = weeksAgoUtc(i);
        const key = isoDate(w);
        const b = buckets.get(key) ?? { allocated: 0, capacity: 0 };
        points.push({ weekStart: key, allocated: b.allocated, capacity: b.capacity });
    }
    return points;
}

// ─── 6. Évolution coût RH réel (budget_recompute_runs) ──────────────────────

export async function fetchRhBudgetCostTrend(enterpriseId: string): Promise<RhBudgetCostDayPoint[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("budget_recompute_runs")
        .select("started_at, total_actual_after")
        .eq("enterprise_id", eid)
        .not("total_actual_after", "is", null)
        .order("started_at", { ascending: true });

    if (error) throwFromPostgrest("Tendance coût RH", error);

    const byDay = new Map<string, number>();
    for (const row of data ?? []) {
        const d = parseDate((row as { started_at?: string }).started_at);
        if (!d) continue;
        const day = isoDate(d);
        const cost = num((row as { total_actual_after?: unknown }).total_actual_after);
        const prev = byDay.get(day);
        byDay.set(day, prev == null ? cost : Math.max(prev, cost));
    }

    return [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, totalActual]) => ({ day, totalActual }));
}

// ─── 7. Flux demandes créées vs décidées (6 semaines) ───────────────────────

export async function fetchRhRequestsFlow6w(enterpriseId: string): Promise<RhRequestsFlowWeekPoint[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();
    const from = weeksAgoUtc(6);

    const { data, error } = await client
        .from("talent_requests")
        .select("created_at, decided_at")
        .eq("enterprise_id", eid)
        .or(`created_at.gte.${from.toISOString()},decided_at.gte.${from.toISOString()}`);

    if (error) throwFromPostgrest("Flux des demandes", error);

    const buckets = new Map<string, { created: number; decided: number }>();
    const ensure = (key: string) => {
        const cur = buckets.get(key) ?? { created: 0, decided: 0 };
        buckets.set(key, cur);
        return cur;
    };

    for (const row of data ?? []) {
        const created = parseDate((row as { created_at?: string }).created_at);
        if (created && created >= from) {
            ensure(weekKey(created)).created += 1;
        }
        const decided = parseDate((row as { decided_at?: string }).decided_at);
        if (decided && decided >= from) {
            ensure(weekKey(decided)).decided += 1;
        }
    }

    const points: RhRequestsFlowWeekPoint[] = [];
    for (let i = 5; i >= 0; i -= 1) {
        const w = weeksAgoUtc(i);
        const key = isoDate(w);
        const b = buckets.get(key) ?? { created: 0, decided: 0 };
        points.push({ weekStart: key, created: b.created, decided: b.decided });
    }
    return points;
}

// ─── 8. Scatter 9-Box ──────────────────────────────────────────────────────

type NineBoxJoinRow = {
    talent_id: string;
    performance_score: number | string | null;
    potential_score: number | string | null;
    box_label: string | null;
    talents:
        | {
              first_name?: string | null;
              last_name?: string | null;
              name?: string | null;
              full_name?: string | null;
          }
        | {
              first_name?: string | null;
              last_name?: string | null;
              name?: string | null;
              full_name?: string | null;
          }[]
        | null;
};

export async function fetchRhNineBoxScatter(enterpriseId: string): Promise<RhNineBoxScatterPoint[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("analyst_nine_box_results")
        .select(
            "talent_id, performance_score, potential_score, box_label, talents(first_name, last_name, name, full_name)",
        )
        .eq("enterprise_id", eid);

    if (error) throwFromPostgrest("Matrice 9-Box", error);

    const points: RhNineBoxScatterPoint[] = [];
    for (const raw of (data ?? []) as NineBoxJoinRow[]) {
        const talentId = str(raw.talent_id);
        if (!talentId) continue;
        const talentRel = Array.isArray(raw.talents) ? raw.talents[0] : raw.talents;
        points.push({
            talentId,
            name: talentDisplayName(talentRel ?? {}),
            performance: num(raw.performance_score),
            potential: num(raw.potential_score),
            boxLabel: str(raw.box_label) || "non défini",
        });
    }
    return points;
}

// ─── 9. Distribution IPI (bands) ───────────────────────────────────────────

export async function fetchRhIpiBandDistribution(enterpriseId: string): Promise<RhIpiBandCount[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("analyst_ipi_results")
        .select("ipi_band, band")
        .eq("enterprise_id", eid);

    if (error) throwFromPostgrest("Distribution IPI", error);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
        const band = normalizeDashboardLabel(
            str((row as { ipi_band?: string; band?: string }).ipi_band) ||
                str((row as { band?: string }).band),
        );
        counts.set(band, (counts.get(band) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([band, count]) => ({ band, count }))
        .sort((a, b) => b.count - a.count);
}

// ─── 10. Masse salariale par séniorité (agrégat) ────────────────────────────

type EmploymentSeniorityRow = {
    salary: number | string | null;
    talents:
        | { seniority_level?: string | null; enterprise_id?: string }
        | { seniority_level?: string | null; enterprise_id?: string }[]
        | null;
};

/**
 * Agrégat salaire × séniorité. Aucun salaire individuel dans le résultat.
 * Normalisation LOWER(TRIM()) sur seniority_level.
 */
export async function fetchRhPayrollBySeniority(enterpriseId: string): Promise<RhPayrollBySeniorityRow[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    const { data, error } = await client
        .from("talent_employment")
        .select("salary, talents!inner(seniority_level, enterprise_id)")
        .eq("talents.enterprise_id", eid)
        .not("salary", "is", null);

    if (error) throwFromPostgrest("Masse salariale par séniorité", error);

    const buckets = new Map<string, { totalPayroll: number; headcount: number }>();
    for (const raw of (data ?? []) as EmploymentSeniorityRow[]) {
        const salary = num(raw.salary);
        if (salary <= 0) continue;
        const talentRel = Array.isArray(raw.talents) ? raw.talents[0] : raw.talents;
        const key = normalizeDashboardLabel(talentRel?.seniority_level);
        const cur = buckets.get(key) ?? { totalPayroll: 0, headcount: 0 };
        cur.totalPayroll += salary;
        cur.headcount += 1;
        buckets.set(key, cur);
    }

    return [...buckets.entries()]
        .map(([seniorityKey, v]) => ({
            seniorityKey,
            seniorityLabel: displayDashboardLabel(seniorityKey),
            totalPayroll: v.totalPayroll,
            headcount: v.headcount,
        }))
        .sort((a, b) => b.totalPayroll - a.totalPayroll);
}

// ─── 11. Demande de compétences (project_requirements) ──────────────────────

export async function fetchRhSkillDemand(enterpriseId: string): Promise<RhSkillDemandRow[]> {
    const eid = assertEnterpriseId(enterpriseId);
    const client = requireSupabase();

    // project_requirements → projects.enterprise_id
    const { data, error } = await client
        .from("project_requirements")
        .select("skill_name, skill, name, projects!inner(enterprise_id)")
        .eq("projects.enterprise_id", eid);

    if (error) throwFromPostgrest("Couverture compétences (demande)", error);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
        const r = row as { skill_name?: string; skill?: string; name?: string };
        const key = normalizeDashboardLabel(r.skill_name || r.skill || r.name);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([skillKey, projectsRequiring]) => ({
            skillKey,
            skillLabel: displayDashboardLabel(skillKey),
            projectsRequiring,
        }))
        .sort((a, b) => b.projectsRequiring - a.projectsRequiring);
}
