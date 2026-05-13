import { AxiosError } from "axios";
import { getManagerTeamTalentDetailUrl } from "@/config/manager-team-api.config";
import { httpClient } from "../lib/http-client";
import type { AlertItem, TalentDetailResponse, TalentTopProject, TeamListResponse } from "../types/api.types";

/** UUID (insensible à la casse) — même règle que n8n `[DETAIL] Extract`. */
export const MANAGER_TEAM_TALENT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise le segment d’URL `/manager/team/:talentId` (décodage + casse pour Postgres `$1::uuid`). */
export function normalizeManagerTeamRouteTalentId(raw: string): string {
    try {
        return decodeURIComponent(String(raw ?? "").trim()).toLowerCase();
    } catch {
        return String(raw ?? "").trim().toLowerCase();
    }
}

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Première valeur qui ressemble à un UUID (même règle que la route) — évite d’utiliser un e-mail ou un entier comme id métier. */
function uuidTalentCandidate(v: unknown): string {
    const s = v == null ? "" : String(v).trim().toLowerCase();
    return s && MANAGER_TEAM_TALENT_UUID_RE.test(s) ? s : "";
}

/**
 * Identifiant métier « talent » pour GET /manager/team/:id — champs explicites d’abord, puis alias fréquents (person_id, talent imbriqué…).
 * Si l’API ne renvoie que `id` (souvent user_id), le détail peut 404 : il faut un champ talent distinct côté n8n.
 */
function pickTalentBusinessUuid(row: Record<string, unknown>): string {
    const nested = row.talent;
    const talentObj =
        nested && typeof nested === "object" && !Array.isArray(nested) ? (nested as Record<string, unknown>) : null;
    return (
        uuidTalentCandidate(row.talent_id) ||
        uuidTalentCandidate(row.talent_uuid) ||
        uuidTalentCandidate(row.talentId) ||
        (talentObj &&
            (uuidTalentCandidate(talentObj.talent_id) ||
                uuidTalentCandidate(talentObj.id) ||
                uuidTalentCandidate(talentObj.uuid))) ||
        uuidTalentCandidate(row.person_id) ||
        uuidTalentCandidate(row.employee_id) ||
        uuidTalentCandidate(row.user_talent_id) ||
        ""
    );
}

function parseTopProject(v: unknown): TalentTopProject | null {
    if (v == null || typeof v !== "object") return null;
    const o = asRecord(v);
    const id = String(o.id ?? "").trim();
    if (!id) return null;
    const pr = o.priority;
    const priority = pr == null || pr === "" ? null : Number(pr);
    return {
        id,
        name: String(o.name ?? "").trim() || "—",
        status: String(o.status ?? "").trim() || "—",
        priority: priority != null && Number.isFinite(priority) ? priority : null,
        milestone_at: o.milestone_at == null || String(o.milestone_at).trim() === "" ? null : String(o.milestone_at),
        decision: o.decision == null || String(o.decision).trim() === "" ? null : String(o.decision),
    };
}

function normalizeTeamResponse(data: unknown): TeamListResponse {
    const root = asRecord(data);
    const rawTalents = Array.isArray(root.talents) ? root.talents : Array.isArray(root.items) ? root.items : [];

    const talents = rawTalents.map((item, index) => {
        const row = asRecord(item);
        /** UUID métier « talent » — obligatoire pour GET /manager/team/:id ; `id` seul peut être un user_id ou autre clé. */
        const talent_id_raw = pickTalentBusinessUuid(row);
        const id_raw = row.id != null ? String(row.id).trim() : "";
        const id = (talent_id_raw || id_raw || `talent-${index}`).trim();
        const full_name = String(row.full_name ?? row.name ?? row.fullName ?? id).trim();
        const email = String(row.email ?? row.talent_email ?? row.mail ?? row.user_email ?? "").trim();
        const status_color = (String(row.status_color ?? row.statusColor ?? "green").trim() || "green") as "green" | "orange" | "red";
        const total_allocation_pct = Number(row.total_allocation_pct ?? row.allocation_pct ?? row.total_allocation ?? 0) || 0;
        const active_alerts_count = Number(row.active_alerts_count ?? row.alerts_count ?? 0) || 0;
        const active_projects_count = Number(row.active_projects_count ?? 0) || 0;
        const absences_last_90d = Number(row.absences_last_90d ?? 0) || 0;
        const role = row.role == null ? null : String(row.role);
        const contract_end_date =
            row.contract_end_date == null || String(row.contract_end_date).trim() === ""
                ? null
                : String(row.contract_end_date);
        const contract_ending_soon = Boolean(row.contract_ending_soon);
        const capacity_hours_per_week = row.capacity_hours_per_week == null ? null : Number(row.capacity_hours_per_week);
        const main_skills = Array.isArray(row.main_skills)
            ? row.main_skills.map((skill) => String(skill).trim()).filter((skill) => skill.length > 0)
            : [];
        const remaining_capacity_pct = Math.max(0, 100 - total_allocation_pct);
        const insights = asRecord(row.insights);

        const pr = row.project_priority ?? row.priority;
        const project_priority = pr == null || pr === "" ? null : Number(pr);
        const ms = row.project_milestone_at ?? row.milestone_at;
        const project_milestone_at = ms == null || String(ms).trim() === "" ? null : String(ms);
        const st = row.project_status ?? row.status_project;
        const project_status = st == null || String(st).trim() === "" ? null : String(st);
        const dec = row.latest_decision ?? row.copilot_decision ?? row.project_decision;
        const latest_decision = dec == null || String(dec).trim() === "" ? null : String(dec);
        const pn = row.primary_project_name ?? row.project_name;
        let primary_project_name = pn == null || String(pn).trim() === "" ? null : String(pn);
        let project_priority_adj = Number.isFinite(project_priority) ? project_priority : null;
        let project_status_adj = project_status;
        let project_milestone_at_adj = project_milestone_at;
        let latest_decision_adj = latest_decision;

        const top_project = parseTopProject(row.top_project);
        if (top_project) {
            if (primary_project_name == null && top_project.name && top_project.name !== "—") primary_project_name = top_project.name;
            if (project_priority_adj == null && top_project.priority != null) project_priority_adj = top_project.priority;
            if (project_status_adj == null) project_status_adj = top_project.status !== "—" ? top_project.status : null;
            if (project_milestone_at_adj == null && top_project.milestone_at) project_milestone_at_adj = top_project.milestone_at;
            if (latest_decision_adj == null && top_project.decision) latest_decision_adj = top_project.decision;
        }

        const employment_status =
            row.employment_status == null || String(row.employment_status).trim() === ""
                ? null
                : String(row.employment_status);

        return {
            id,
            talent_id: talent_id_raw || undefined,
            full_name,
            email,
            status_color,
            total_allocation_pct,
            active_alerts_count,
            main_skills,
            active_projects_count,
            remaining_capacity_pct,
            contract_end_date,
            contract_ending_soon,
            absences_last_90d,
            role,
            employment_status,
            capacity_hours_per_week: Number.isFinite(capacity_hours_per_week) ? capacity_hours_per_week : null,
            insights: {
                nine_box_label: insights.nine_box_label == null ? null : String(insights.nine_box_label),
                ipi_score: insights.ipi_score == null ? null : Number(insights.ipi_score),
                ipi_band: insights.ipi_band == null ? null : String(insights.ipi_band),
                mobility_flag: insights.mobility_flag == null ? null : String(insights.mobility_flag),
            },
            top_project: top_project ?? null,
            primary_project_name,
            project_priority: project_priority_adj,
            project_status: project_status_adj,
            project_milestone_at: project_milestone_at_adj,
            latest_decision: latest_decision_adj,
        };
    });

    return {
        count: Number(root.count ?? talents.length) || talents.length,
        talents,
        distribution: asRecord(root.distribution) as Record<string, number>,
    };
}

function normalizeTalentDetail(data: unknown): TalentDetailResponse {
    const root = asRecord(data);
    if (root.__error === true) {
        const status = Number(root.__http) || 500;
        const msg = String(root.message ?? root.error ?? "Erreur détail talent");
        throw new AxiosError(msg, String(status), undefined, undefined, {
            status,
            statusText: status === 404 ? "Not Found" : "Error",
            data: root,
            headers: {},
            config: {} as never,
        });
    }
    const rawTalent = asRecord(root.talent);
    const talent = {
        id: String(rawTalent.talent_id ?? rawTalent.id ?? "").trim(),
        name: rawTalent.name == null ? undefined : String(rawTalent.name),
        full_name: rawTalent.full_name == null ? undefined : String(rawTalent.full_name),
        email: String(rawTalent.email ?? ""),
        enterprise_id: rawTalent.enterprise_id == null ? undefined : String(rawTalent.enterprise_id),
        manager_user_id: rawTalent.manager_user_id == null ? undefined : String(rawTalent.manager_user_id),
        contract_end_date: rawTalent.contract_end_date == null ? null : String(rawTalent.contract_end_date),
        contract_ending_soon: Boolean(rawTalent.contract_ending_soon),
    };

    const skills = (Array.isArray(root.skills) ? root.skills : []).map((item) => asRecord(item)) as TalentDetailResponse["skills"];
    const active_assignments = (Array.isArray(root.active_assignments) ? root.active_assignments : []).map((item) => {
        const row = asRecord(item);
        return {
            id: row.id == null ? undefined : String(row.id),
            project_id: String(row.project_id ?? ""),
            talent_id: String(row.talent_id ?? talent.id),
            allocation_pct: Number(row.allocation_pct ?? 0),
            start_date: row.start_date == null ? null : String(row.start_date),
            end_date: row.end_date == null ? null : String(row.end_date),
            role_on_project: row.role_on_project == null ? undefined : String(row.role_on_project),
            assignment_type: row.assignment_type == null ? undefined : String(row.assignment_type),
            status: row.status == null ? undefined : String(row.status),
            project_name: row.project_name == null ? undefined : String(row.project_name),
            project_status: row.project_status == null ? undefined : String(row.project_status),
            project_priority: row.project_priority == null ? undefined : Number(row.project_priority),
            project_milestone_at: row.project_milestone_at == null ? null : String(row.project_milestone_at),
        };
    });

    const active_alerts: AlertItem[] = (Array.isArray(root.active_alerts) ? root.active_alerts : []).map((item, index) => {
        const row = asRecord(item);
        const message = row.message == null ? undefined : String(row.message);
        return {
            id: String(row.id ?? row.alert_id ?? `alert-${index}`),
            severity: String(row.severity ?? "low"),
            title: String(row.title ?? message ?? "Alerte"),
            status: row.status == null ? undefined : String(row.status),
            message,
            project_id: row.project_id == null ? undefined : String(row.project_id),
            risk_type: row.risk_type == null ? undefined : String(row.risk_type),
            risk_score: row.risk_score == null ? undefined : Number(row.risk_score),
            detected_at: row.detected_at == null ? undefined : String(row.detected_at),
            impact_area: row.impact_area == null ? undefined : String(row.impact_area),
        };
    });

    return {
        status: root.status === "success" ? "success" : undefined,
        operation: root.operation === "get_detail" ? "get_detail" : undefined,
        talent,
        employment: asRecord(root.employment),
        capacity: asRecord(root.capacity),
        profile: asRecord(root.profile),
        skills,
        active_assignments,
        recent_absences: (Array.isArray(root.recent_absences) ? root.recent_absences : []).map((item) => asRecord(item)),
        active_alerts,
        analyst: asRecord(root.analyst),
        summary: asRecord(root.summary),
    };
}

export const managerTeamApi = {
    list: (params?: { scope?: "mine" | "enterprise"; search?: string; contract_ending?: boolean; limit?: number }) =>
        httpClient.get<unknown>("/webhook/manager/team", { params }).then((r) => ({
            ...r,
            data: normalizeTeamResponse(r.data),
        })),
    detail: (talentId: string) => {
        const id = normalizeManagerTeamRouteTalentId(talentId);
        if (!MANAGER_TEAM_TALENT_UUID_RE.test(id)) {
            return Promise.reject(
                new AxiosError("Identifiant talent invalide.", "400", undefined, undefined, {
                    status: 400,
                    statusText: "Bad Request",
                    data: { message: "Identifiant talent invalide." },
                    headers: {},
                    config: {} as never,
                }),
            );
        }
        const url = getManagerTeamTalentDetailUrl(encodeURIComponent(id));
        return httpClient.get<unknown>(url).then((r) => ({
            ...r,
            data: normalizeTalentDetail(r.data),
        }));
    },
    watchdogScan: (body: { talent_id?: string; project_id?: string; use_ai?: boolean }) =>
        httpClient.post<unknown>("/webhook/api/watchdog/scan", body),
};
