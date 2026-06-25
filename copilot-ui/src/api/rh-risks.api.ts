import { getJwtEnterpriseId } from "@/auth/jwt";
import {
    getRhRisksCreateActionUrl,
    getRhRisksListUrl,
    getRhRisksSummaryUrl,
    getRhRisksTalentUrl,
} from "@/config/rh-risks-api.config";
import { httpClient } from "@/lib/http-client";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RiskType = "overload" | "contract_expiring" | "critical_skill" | "no_manager";
export type Severity = "critical" | "high" | "medium" | "low";

export type Risk = {
    id: string;
    risk_type: RiskType;
    risk_type_label: string;
    talent_id: string;
    talent_name: string;
    project_id: string | null;
    project_name: string | null;
    severity: Severity;
    severity_label: string;
    metric_value: number | null;
    title: string;
    payload: Record<string, unknown>;
};

export type RisksSummary = {
    total_active_talents: number;
    total_risks: number;
    critical_count: number;
    overload_count: number;
    overload_critical: number;
    contract_expiring_30d: number;
    contract_expiring_7d: number;
    no_manager_count: number;
    critical_skills_count: number;
    risk_ratio_pct: number;
};

export type TalentRiskDetail = {
    talent_id: string;
    name: string;
    seniority_level: string | null;
    current_allocation_pct: number | null;
    contract_end_date: string | null;
    manager_user_id: string | null;
};

const RISK_TYPES: RiskType[] = ["overload", "contract_expiring", "critical_skill", "no_manager"];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function readStr(v: unknown, fallback = ""): string {
    return v != null && String(v).trim() ? String(v).trim() : fallback;
}

function readNum(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function readRiskType(v: unknown): RiskType {
    const s = readStr(v).toLowerCase();
    return RISK_TYPES.includes(s as RiskType) ? (s as RiskType) : "overload";
}

function readSeverity(v: unknown): Severity {
    const s = readStr(v).toLowerCase();
    return SEVERITIES.includes(s as Severity) ? (s as Severity) : "medium";
}

function normalizeRisk(raw: unknown): Risk {
    const r = asRecord(raw);
    const payloadRaw = r.payload;
    const payload =
        payloadRaw && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
            ? (payloadRaw as Record<string, unknown>)
            : {};

    return {
        id: readStr(r.id ?? r.risk_id) || `risk-${readStr(r.talent_id)}-${readStr(r.risk_type)}`,
        risk_type: readRiskType(r.risk_type),
        risk_type_label: readStr(r.risk_type_label, readStr(r.risk_type)),
        talent_id: readStr(r.talent_id),
        talent_name: readStr(r.talent_name, "—"),
        project_id: readStr(r.project_id) || null,
        project_name: readStr(r.project_name) || null,
        severity: readSeverity(r.severity),
        severity_label: readStr(r.severity_label, readStr(r.severity)),
        metric_value: readNum(r.metric_value),
        title: readStr(r.title, "—"),
        payload,
    };
}

function normalizeSummary(raw: unknown): RisksSummary {
    const r = asRecord(raw);
    return {
        total_active_talents: readNum(r.total_active_talents) ?? 0,
        total_risks: readNum(r.total_risks) ?? 0,
        critical_count: readNum(r.critical_count) ?? 0,
        overload_count: readNum(r.overload_count) ?? 0,
        overload_critical: readNum(r.overload_critical) ?? 0,
        contract_expiring_30d: readNum(r.contract_expiring_30d) ?? 0,
        contract_expiring_7d: readNum(r.contract_expiring_7d) ?? 0,
        no_manager_count: readNum(r.no_manager_count) ?? 0,
        critical_skills_count: readNum(r.critical_skills_count) ?? 0,
        risk_ratio_pct: readNum(r.risk_ratio_pct) ?? 0,
    };
}

function normalizeTalent(raw: unknown): TalentRiskDetail {
    const r = asRecord(raw);
    const managerId = readStr(r.manager_user_id);
    return {
        talent_id: readStr(r.talent_id ?? r.id),
        name: readStr(r.name ?? r.talent_name, "—"),
        seniority_level: readStr(r.seniority_level) || null,
        current_allocation_pct: readNum(r.current_allocation_pct),
        contract_end_date: readStr(r.contract_end_date) || null,
        manager_user_id: managerId || null,
    };
}

const E = () => getJwtEnterpriseId();

export const rhRisksApi = {
    list: async (params?: {
        risk_type?: string;
        severity?: string;
        talent_id?: string;
        project_id?: string;
        limit?: number;
    }) => {
        const { data } = await httpClient.get<unknown>(getRhRisksListUrl(), {
            params: {
                enterprise_id: E() ?? "",
                risk_type: params?.risk_type?.trim() || undefined,
                severity: params?.severity?.trim() || undefined,
                talent_id: params?.talent_id?.trim() || undefined,
                project_id: params?.project_id?.trim() || undefined,
                limit: params?.limit ?? 200,
            },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const risksRaw = root.risks ?? root.items;
        const risks = Array.isArray(risksRaw) ? risksRaw.map(normalizeRisk) : [];
        return {
            success: true as const,
            count: readNum(root.count) ?? risks.length,
            risks,
        };
    },

    summary: async () => {
        const { data } = await httpClient.get<unknown>(getRhRisksSummaryUrl(), {
            params: { enterprise_id: E() ?? "" },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        return {
            success: true as const,
            summary: normalizeSummary(root.summary ?? root),
        };
    },

    talentDetail: async (talentId: string) => {
        const { data } = await httpClient.get<unknown>(getRhRisksTalentUrl(talentId), {
            params: { enterprise_id: E() ?? "" },
            skipGlobalHttpErrorToast: true,
        });
        const root = unwrapN8nRoot(data);
        const talent = normalizeTalent(root.talent ?? root);
        const risksRaw = root.risks ?? root.items;
        const risks = Array.isArray(risksRaw) ? risksRaw.map(normalizeRisk) : [];
        return {
            success: true as const,
            talent,
            risks,
        };
    },

    createAction: async (body: {
        risk_type: string;
        talent_id: string;
        project_id?: string | null;
        action_type: string;
        priority?: string;
        message?: string;
        payload?: Record<string, unknown>;
    }) => {
        const { data } = await httpClient.post<unknown>(
            getRhRisksCreateActionUrl(),
            {
                enterprise_id: E() ?? "",
                risk_type: body.risk_type,
                talent_id: body.talent_id,
                project_id: body.project_id ?? undefined,
                action_type: body.action_type,
                priority: body.priority,
                message: body.message,
                payload: body.payload,
            },
            { skipGlobalHttpErrorToast: true },
        );
        const root = unwrapN8nRoot(data);
        return {
            success: true as const,
            action: root.action ?? root.data ?? root,
        };
    },
};
