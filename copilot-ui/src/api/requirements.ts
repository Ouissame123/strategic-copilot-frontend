import { API_ROUTES } from "@/lib/api-routes";
import { buildBrowserFetchN8nUrl } from "@/lib/build-n8n-url";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export interface Requirement {
    requirement_id: string;
    project_id?: string;
    skill_id: string;
    skill_name: string;
    skill_type: string;
    skill_category: string;
    level_required: number;
    criticality: number;
    weight: number;
    is_mandatory: boolean;
    requirement_type: string;
    priority: number;
    best_pool_level: number | null;
    enterprise_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface RequirementsStats {
    total: number;
    covered: number;
    partial: number;
    uncovered: number;
    critical: number;
}

export interface RequirementsListResponse {
    status: string;
    project_id?: string;
    stats: RequirementsStats;
    requirements: Requirement[];
    meta?: Record<string, unknown>;
}

export interface RequirementCreateBody {
    skill_id: string;
    level_required: number;
    criticality?: number;
    weight?: number;
    is_mandatory?: boolean;
    requirement_type?: string;
    priority?: number;
}

export interface RequirementPatchBody {
    level_required?: number;
    criticality?: number;
    weight?: number;
    is_mandatory?: boolean;
    requirement_type?: string;
    priority?: number;
}

export type SkillPickerItem = {
    skill_id: string;
    skill_name: string;
    skill_category?: string;
    skill_type?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
    return UUID_RE.test(String(value ?? "").trim());
}

function headers(token: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

function requirementsListUrl(projectId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.reqList(projectId));
}

function requirementsCreateUrl(projectId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.reqCreate(projectId));
}

function requirementsUpdateUrl(projectId: string, requirementId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.reqUpdate(projectId, requirementId));
}

function requirementsDeleteUrl(projectId: string, requirementId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.reqDelete(projectId, requirementId));
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function nullableNum(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function str(v: unknown, fallback = ""): string {
    const s = v != null ? String(v).trim() : "";
    return s || fallback;
}

function normalizeRequirement(raw: unknown): Requirement | null {
    const r = asRecord(raw);
    const requirement_id = str(r.requirement_id ?? r.id);
    const skill_id = str(r.skill_id);
    if (!requirement_id || !skill_id) return null;
    const bestRaw = r.best_pool_level ?? r.pool_level ?? r.max_pool_level;
    const best_pool_level =
        bestRaw === null || bestRaw === undefined || bestRaw === ""
            ? null
            : nullableNum(bestRaw);
    return {
        requirement_id,
        project_id: str(r.project_id) || undefined,
        skill_id,
        skill_name: str(r.skill_name, "Compétence inconnue"),
        skill_type: str(r.skill_type, "technical"),
        skill_category: str(r.skill_category),
        level_required: Math.round(num(r.level_required, 1)),
        criticality: Math.round(num(r.criticality, 2)),
        weight: Math.round(num(r.weight, 2)),
        is_mandatory: r.is_mandatory === true || r.is_mandatory === 1 || String(r.is_mandatory).toLowerCase() === "true",
        requirement_type: str(r.requirement_type, "core"),
        priority: Math.round(num(r.priority, 5)),
        best_pool_level,
        enterprise_id: str(r.enterprise_id) || undefined,
        created_at: str(r.created_at) || undefined,
        updated_at: str(r.updated_at) || undefined,
    };
}

function normalizeStats(raw: unknown, requirements: Requirement[]): RequirementsStats {
    const s = asRecord(raw);
    if (s.total != null || s.covered != null) {
        return {
            total: Math.round(num(s.total, requirements.length)),
            covered: Math.round(num(s.covered, 0)),
            partial: Math.round(num(s.partial, 0)),
            uncovered: Math.round(num(s.uncovered, 0)),
            critical: Math.round(num(s.critical, 0)),
        };
    }
    let covered = 0;
    let partial = 0;
    let uncovered = 0;
    let critical = 0;
    for (const req of requirements) {
        if (req.criticality >= 3) critical += 1;
        const pool = req.best_pool_level;
        if (pool == null || pool <= 0) uncovered += 1;
        else if (pool >= req.level_required) covered += 1;
        else partial += 1;
    }
    return { total: requirements.length, covered, partial, uncovered, critical };
}

function normalizeListResponse(raw: unknown): RequirementsListResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = root.requirements ?? root.items;
    const requirements = Array.isArray(listRaw)
        ? listRaw.map((item) => normalizeRequirement(item)).filter((r): r is Requirement => r != null)
        : [];
    return {
        status: str(root.status, "success"),
        project_id: str(root.project_id) || undefined,
        stats: normalizeStats(root.stats, requirements),
        requirements,
        meta: asRecord(root.meta),
    };
}

function normalizeRequirementResponse(raw: unknown): Requirement {
    const root = unwrapN8nRoot(raw);
    const reqRaw = root.requirement ?? root.data ?? root;
    const req = normalizeRequirement(reqRaw);
    if (!req) throw new Error("Réponse exigence invalide");
    return req;
}

async function parseError(res: Response): Promise<string> {
    try {
        const json = await res.json();
        const root = unwrapN8nRoot(json);
        return str(root.message ?? root.error, `HTTP ${res.status}`);
    } catch {
        return `HTTP ${res.status}`;
    }
}

export async function fetchRequirements(projectId: string, token: string): Promise<RequirementsListResponse> {
    const res = await fetch(requirementsListUrl(projectId), { headers: headers(token) });
    if (!res.ok) throw new Error(await parseError(res));
    const json = await res.json();
    return normalizeListResponse(json);
}

export async function createRequirement(
    projectId: string,
    body: RequirementCreateBody,
    token: string,
): Promise<{ status: string; action?: string; requirement: Requirement; meta?: Record<string, unknown> }> {
    const res = await fetch(requirementsCreateUrl(projectId), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const json = await res.json();
    const root = unwrapN8nRoot(json);
    return {
        status: str(root.status, "success"),
        action: str(root.action) || undefined,
        requirement: normalizeRequirementResponse(json),
        meta: asRecord(root.meta),
    };
}

export async function patchRequirement(
    projectId: string,
    requirementId: string,
    body: RequirementPatchBody,
    token: string,
): Promise<{ status: string; action?: string; requirement: Requirement; meta?: Record<string, unknown> }> {
    const res = await fetch(requirementsUpdateUrl(projectId, requirementId), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const json = await res.json();
    const root = unwrapN8nRoot(json);
    return {
        status: str(root.status, "success"),
        action: str(root.action) || undefined,
        requirement: normalizeRequirementResponse(json),
        meta: asRecord(root.meta),
    };
}

export async function deleteRequirement(
    projectId: string,
    requirementId: string,
    token: string,
): Promise<{ status: string; action?: string; deleted_id?: string }> {
    const res = await fetch(requirementsDeleteUrl(projectId, requirementId), {
        method: "DELETE",
        headers: headers(token),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const json = await res.json();
    const root = unwrapN8nRoot(json);
    return {
        status: str(root.status, "success"),
        action: str(root.action) || undefined,
        deleted_id: str(root.deleted_id ?? root.deleted_requirement_id) || undefined,
    };
}

export async function fetchSkillsCatalog(token: string, signal?: AbortSignal): Promise<SkillPickerItem[]> {
    const url = buildBrowserFetchN8nUrl(API_ROUTES.skillsCatalog());
    try {
        const res = await fetch(url, { headers: headers(token), signal });
        if (!res.ok) return [];
        const json = await res.json();
        const root = unwrapN8nRoot(json);
        const catalog = root.catalog ?? root.skills ?? root.items;
        if (!Array.isArray(catalog)) return [];
        return catalog
            .map((row): SkillPickerItem | null => {
                const r = asRecord(row);
                const skill_id = str(r.skill_id ?? r.id);
                const skill_name = str(r.skill_name ?? r.name);
                if (!skill_id || !isValidUuid(skill_id) || !skill_name) return null;
                return {
                    skill_id,
                    skill_name,
                    skill_category: str(r.skill_category ?? r.category) || undefined,
                    skill_type: str(r.skill_type ?? r.type) || undefined,
                };
            })
            .filter((x): x is SkillPickerItem => x != null);
    } catch {
        return [];
    }
}
