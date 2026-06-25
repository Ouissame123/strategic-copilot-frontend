import type { ManagerHRActionsListResponse, RhAction, RhActionPayload, TalentProposal } from "@/types/manager-hr-actions.types";
import { asRecord } from "@/utils/unwrap-api-payload";

function parseTalentProposal(row: unknown): TalentProposal | null {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const r = row as Record<string, unknown>;
    const talent_id = String(r.talent_id ?? "").trim();
    const talent_name = String(r.talent_name ?? r.name ?? "").trim();
    if (!talent_id && !talent_name) return null;
    const out: TalentProposal = { talent_id, talent_name: talent_name || talent_id };
    if (typeof r.current_load_pct === "number") out.current_load_pct = r.current_load_pct;
    if (typeof r.matching_skills_count === "number") out.matching_skills_count = r.matching_skills_count;
    if (typeof r.proposed_allocation_pct === "number") out.proposed_allocation_pct = r.proposed_allocation_pct;
    return out;
}

function parsePayload(raw: unknown): RhActionPayload | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const p = raw as Record<string, unknown>;
    const out: RhActionPayload = {};
    if (p.source != null) out.source = String(p.source);
    if (p.talent_request_id != null) out.talent_request_id = String(p.talent_request_id);
    if (p.talent_id != null) out.talent_id = String(p.talent_id);
    if (p.request_type != null) out.request_type = String(p.request_type);
    if (p.original_title != null) out.original_title = String(p.original_title);
    if (p.original_description != null) out.original_description = String(p.original_description);
    if (p.transferred_at != null) out.transferred_at = String(p.transferred_at);
    if (Array.isArray(p.talents)) {
        out.talents = p.talents.map(parseTalentProposal).filter((t): t is TalentProposal => t != null);
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeRhAction(row: unknown): RhAction {
    const r = asRecord(row);
    const payload = parsePayload(r.payload);

    return {
        id: String(r.id ?? "").trim().toLowerCase(),
        enterprise_id: r.enterprise_id != null ? String(r.enterprise_id) : undefined,
        manager_id: r.manager_id != null ? String(r.manager_id) : undefined,
        project_id: r.project_id != null && String(r.project_id).trim() ? String(r.project_id).trim() : null,
        type: String(r.type ?? "").trim(),
        message: String(r.message ?? "").trim(),
        priority: String(r.priority ?? "normal").trim(),
        status: String(r.status ?? "pending").trim(),
        assigned_to: r.assigned_to != null && String(r.assigned_to).trim() ? String(r.assigned_to).trim() : null,
        response_message:
            r.response_message != null && String(r.response_message).trim() ? String(r.response_message).trim() : null,
        created_at: String(r.created_at ?? "").trim(),
        updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
        completed_at: r.completed_at != null && String(r.completed_at).trim() ? String(r.completed_at).trim() : null,
        payload,
        source_talent_request_id:
            r.source_talent_request_id != null && String(r.source_talent_request_id).trim()
                ? String(r.source_talent_request_id).trim().toLowerCase()
                : null,
    };
}

export function normalizeManagerHRActionsListResponse(raw: unknown): ManagerHRActionsListResponse {
    const root = asRecord(raw);
    const items = Array.isArray(root.items) ? root.items.map(normalizeRhAction).filter((x) => x.id) : [];
    return {
        status: String(root.status ?? "success"),
        workflow: root.workflow != null ? String(root.workflow) : undefined,
        action: root.action != null ? String(root.action) : undefined,
        count: Number(root.count) || items.length,
        items,
    };
}

export function normalizeRhActionFromMutationResponse(raw: unknown): RhAction {
    const root = asRecord(raw);
    const data = root.data != null ? root.data : root;
    return normalizeRhAction(data);
}
