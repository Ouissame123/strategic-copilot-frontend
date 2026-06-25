import type { TalentDashboard } from "@/types/talent-dashboard";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

/** Déballage n8n — aucun calcul métier. */
export function normalizeTalentDashboard(raw: unknown): TalentDashboard {
    const root = unwrapN8nRoot(raw);
    const kpisRaw = asRecord(root.kpis);

    const dashboard: TalentDashboard = {
        status: "success",
        talent_id: String(root.talent_id ?? ""),
        enterprise_id: String(root.enterprise_id ?? ""),
        header: root.header as TalentDashboard["header"],
        health: root.health as TalentDashboard["health"],
        priorities: root.priorities ? arr(root.priorities) : undefined,
        alerts: root.alerts ? arr(root.alerts) : undefined,
        contract_alert: (root.contract_alert as TalentDashboard["contract_alert"]) ?? undefined,
        active_projects: root.active_projects ? arr(root.active_projects) : undefined,
        top_matches: root.top_matches ? arr(root.top_matches) : undefined,
        top_skills: root.top_skills ? arr(root.top_skills) : undefined,
        skills_stats: root.skills_stats as TalentDashboard["skills_stats"],
        requests_summary: root.requests_summary as TalentDashboard["requests_summary"],
        capacity: root.capacity as TalentDashboard["capacity"],
        manager: (root.manager as TalentDashboard["manager"]) ?? undefined,
    };

    if (root.kpis && typeof root.kpis === "object") {
        const mobility = asRecord(kpisRaw.mobility);
        dashboard.kpis = {
            ...(kpisRaw as TalentDashboard["kpis"]),
            mobility: {
                ...(mobility as TalentDashboard["kpis"] extends { mobility: infer M } ? M : never),
                drivers: arr<string>(mobility.drivers),
            },
        };
    }

    return dashboard;
}
