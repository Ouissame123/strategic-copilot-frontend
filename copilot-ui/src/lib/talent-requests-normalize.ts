import type {
    TalentRequest,
    TalentRequestPriority,
    TalentRequestStatus,
    TalentRequestType,
    TalentRequestsSummary,
} from "@/types/talent-requests";
import { asRecord, firstArray, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readOptionalString(row: Record<string, unknown>, key: string): string | null {
    const v = row[key];
    if (v == null || v === "") return null;
    return String(v);
}

function readOptionalBoolean(row: Record<string, unknown>, key: string): boolean | undefined {
    if (row[key] === undefined) return undefined;
    return Boolean(row[key]);
}

export function normalizeTalentRequest(raw: unknown): TalentRequest {
    const row = asRecord(raw);
    const request: TalentRequest = {
        id: String(row.id ?? ""),
        request_type: String(row.request_type ?? "autre") as TalentRequestType,
        request_type_label: String(row.request_type_label ?? ""),
        title: String(row.title ?? ""),
        description: readOptionalString(row, "description"),
        payload: asRecord(row.payload),
        status: String(row.status ?? "pending") as TalentRequestStatus,
        status_label: String(row.status_label ?? ""),
        priority: (String(row.priority ?? "normal") as TalentRequestPriority) || "normal",
        manager_user_id: readOptionalString(row, "manager_user_id"),
        manager_name: readOptionalString(row, "manager_name"),
        manager_email: readOptionalString(row, "manager_email"),
        decided_at: readOptionalString(row, "decided_at"),
        decided_by: readOptionalString(row, "decided_by"),
        decided_by_name: readOptionalString(row, "decided_by_name"),
        decided_by_role: readOptionalString(row, "decided_by_role"),
        decision_reason: readOptionalString(row, "decision_reason"),
        hr_transferred_at: readOptionalString(row, "hr_transferred_at"),
        created_at: String(row.created_at ?? ""),
        updated_at: String(row.updated_at ?? ""),
    };

    const canCancel = readOptionalBoolean(row, "can_cancel");
    const canDelete = readOptionalBoolean(row, "can_delete");
    if (canCancel !== undefined) request.can_cancel = canCancel;
    if (canDelete !== undefined) request.can_delete = canDelete;

    const talentId = readOptionalString(row, "talent_id");
    const talentName = readOptionalString(row, "talent_name") ?? readOptionalString(row, "full_name");
    const talentEmail = readOptionalString(row, "talent_email") ?? readOptionalString(row, "email");
    if (talentId) request.talent_id = talentId;
    if (talentName) request.talent_name = talentName;
    if (talentEmail) request.talent_email = talentEmail;

    return request;
}

function readCountMap(raw: unknown): Record<string, number> {
    const row = asRecord(raw);
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(row)) {
        const n = Number(value);
        if (Number.isFinite(n)) out[key] = n;
    }
    return out;
}

export function normalizeTalentRequestsSummary(raw: unknown): TalentRequestsSummary {
    const root = unwrapN8nRoot(raw);
    const summary = asRecord(root.summary ?? root);
    const byStatus = readCountMap(summary.by_status);
    const byType = readCountMap(summary.by_type);

    return {
        total: Number(summary.total) || 0,
        by_status: byStatus as TalentRequestsSummary["by_status"],
        by_type: byType as TalentRequestsSummary["by_type"],
        urgent: Number(summary.urgent) || 0,
    };
}

export function normalizeTalentRequestsList(raw: unknown): TalentRequest[] {
    const root = unwrapN8nRoot(raw);
    const items = firstArray(root, ["items", "requests"]);
    return items.map((row) => normalizeTalentRequest(row));
}

export function normalizeTalentRequestDetail(raw: unknown): TalentRequest {
    const root = unwrapN8nRoot(raw);
    const request = root.request ?? root;
    return normalizeTalentRequest(request);
}
