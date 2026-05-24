/**
 * WF_RH Skills — un webhook n8n par opération (GET / ADD / UPDATE / DELETE / CATALOG).
 */
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import type {
    AddRhTalentSkillPayload,
    RhTalentSkill,
    RhTalentSkillsResponse,
    RhTalentSkillsSummary,
    UpdateRhTalentSkillPayload,
} from "@/types/rh-talent-skills.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

/** Slugs workflow n8n — une URL par opération. */
export const RH_SKILLS_GET_SLUG = "wf-rh-skills-get-v1";
export const RH_SKILLS_ADD_SLUG = "wf-rh-skills-add-v1";
export const RH_SKILLS_UPDATE_SLUG = "wf-rh-skills-update-v1";
export const RH_SKILLS_DELETE_SLUG = "wf-rh-skills-delete-v1";
/** @deprecated Utiliser `RH_SKILLS_GET_SLUG`. */
export const RH_SKILLS_WORKFLOW_SLUG = RH_SKILLS_GET_SLUG;

export type RhSkillsWebhookOp = "get" | "add" | "update" | "delete";

const RH_SKILLS_SLUG_BY_OP: Record<RhSkillsWebhookOp, string> = {
    get: RH_SKILLS_GET_SLUG,
    add: RH_SKILLS_ADD_SLUG,
    update: RH_SKILLS_UPDATE_SLUG,
    delete: RH_SKILLS_DELETE_SLUG,
};

/** Prod GET — conservé pour compat. */
export const RH_SKILLS_BASE_URL = `${RH_DASHBOARD_WEBHOOK_BASE.replace(/\/$/, "")}/${RH_SKILLS_GET_SLUG}`;

export type RhTalentSkillsFetchOptions = ApiClientOptions & {
    /** @deprecated Ignoré pour l’URL — conservé pour compat hooks (token uniquement). */
    apiBase?: string;
    token?: string | null;
};

const PLACEHOLDER_TALENT_IDS = new Set([":id", ":talent_id", "{id}", "{talentId}"]);
const PLACEHOLDER_SKILL_IDS = new Set([":skill_id", ":id", "{skill_id}", "{skillId}", "{id}"]);

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function messageFromBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    const msg = String(root.message ?? root.error ?? root.detail ?? "").trim();
    return msg || fallback;
}

export class RhTalentSkillApiError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhTalentSkillApiError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhTalentSkillApiError(err: unknown): string {
    if (err instanceof RhTalentSkillApiError) return err.message;
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.toLowerCase().includes("not registered")) {
        return "Webhook compétences introuvable — vérifiez le slug workflow n8n (wf-rh-skills-*-v1).";
    }
    return raw || "Impossible de charger les compétences";
}

export function assertRhTalentId(talentId: string): string {
    const id = talentId?.trim() ?? "";
    if (!id || PLACEHOLDER_TALENT_IDS.has(id)) {
        throw new RhTalentSkillApiError("Identifiant talent invalide — UUID requis.", {
            code: "INVALID_TALENT_ID",
        });
    }
    return id;
}

export function assertRhSkillId(skillId: string): string {
    const id = skillId?.trim() ?? "";
    if (!id || PLACEHOLDER_SKILL_IDS.has(id)) {
        throw new RhTalentSkillApiError("Identifiant compétence invalide.", { code: "INVALID_SKILL_ID" });
    }
    return id;
}

/**
 * Base webhook skills par opération.
 * Dev : `/webhook/wf-rh-skills-{op}-v1` (proxy Vite).
 * Prod : `https://n8nprod…/webhook/wf-rh-skills-{op}-v1`.
 * `VITE_RH_SKILLS_BASE_URL` surcharge uniquement le GET (legacy).
 */
export function resolveRhSkillsBaseUrl(op: RhSkillsWebhookOp = "get"): string {
    if (op === "get") {
        const fromEnv = (import.meta.env.VITE_RH_SKILLS_BASE_URL as string | undefined)?.trim();
        if (fromEnv) return fromEnv.replace(/\/$/, "");
    }
    const slug = RH_SKILLS_SLUG_BY_OP[op];
    if (import.meta.env.DEV) {
        return `/webhook/${slug}`;
    }
    return `${RH_DASHBOARD_WEBHOOK_BASE.replace(/\/$/, "")}/${slug}`;
}

/** GET `…/rh/talents/{talentId}/skills` */
export function rhTalentSkillsGetUrl(talentId: string): string {
    const id = encodeURIComponent(assertRhTalentId(talentId));
    return `${resolveRhSkillsBaseUrl("get")}/rh/talents/${id}/skills`;
}

/** POST `…/rh/talents/{talentId}/skills` */
export function rhTalentSkillsAddUrl(talentId: string): string {
    const id = encodeURIComponent(assertRhTalentId(talentId));
    return `${resolveRhSkillsBaseUrl("add")}/rh/talents/${id}/skills`;
}

/** PATCH `…/rh/talents/{talentId}/skills/{skillId}` */
export function rhTalentSkillUpdateUrl(talentId: string, skillId: string): string {
    const tid = encodeURIComponent(assertRhTalentId(talentId));
    const sid = encodeURIComponent(assertRhSkillId(skillId));
    return `${resolveRhSkillsBaseUrl("update")}/rh/talents/${tid}/skills/${sid}`;
}

/** DELETE `…/rh/talents/{talentId}/skills/{skillId}` */
export function rhTalentSkillDeleteUrl(talentId: string, skillId: string): string {
    const tid = encodeURIComponent(assertRhTalentId(talentId));
    const sid = encodeURIComponent(assertRhSkillId(skillId));
    return `${resolveRhSkillsBaseUrl("delete")}/rh/talents/${tid}/skills/${sid}`;
}

/** @deprecated Utiliser `resolveRhSkillsCatalogUrl` dans `@/api/rh-skills.api`. */
export { getSkillsCatalog, resolveRhSkillsCatalogUrl } from "@/api/rh-skills.api";

/** @deprecated Utiliser `rhTalentSkillsGetUrl`. */
export function rhTalentSkillsCollectionUrl(talentId: string): string {
    return rhTalentSkillsGetUrl(talentId);
}

/** @deprecated Utiliser `rhTalentSkillUpdateUrl` ou `rhTalentSkillDeleteUrl`. */
export function rhTalentSkillItemUrl(talentId: string, skillId: string): string {
    return rhTalentSkillUpdateUrl(talentId, skillId);
}

function logRhSkillsUrl(method: string, url: string, talentId: string, skillId?: string) {
    console.log("[RH Skills] URL =", url);
    console.log(`[RH Skills] ${method} talent=${talentId}${skillId ? ` skill=${skillId}` : ""}`);
}

/** Corps POST — champs attendus par le workflow ADD (pas level/name/category seuls). */
export function serializeAddTalentSkillBody(payload: AddRhTalentSkillPayload): {
    skill_name: string;
    skill_category: string | null;
    proficiency_level: number;
    years_experience: number | null;
} {
    const skill_name = str(payload.skill_name);
    if (!skill_name) {
        throw new RhTalentSkillApiError("Le nom de la compétence est requis.", { code: "MISSING_SKILL_NAME" });
    }
    return {
        skill_name,
        skill_category: str(payload.skill_category) || null,
        proficiency_level: payload.proficiency_level,
        years_experience: payload.years_experience ?? null,
    };
}

/** Corps PATCH — mêmes clés que POST, champs partiels autorisés. */
export function serializeUpdateTalentSkillBody(
    payload: UpdateRhTalentSkillPayload,
): Partial<ReturnType<typeof serializeAddTalentSkillBody>> {
    const body: Partial<ReturnType<typeof serializeAddTalentSkillBody>> = {};
    if (payload.skill_name != null) {
        const skill_name = str(payload.skill_name);
        if (skill_name) body.skill_name = skill_name;
    }
    if (payload.skill_category !== undefined) {
        body.skill_category = str(payload.skill_category) || null;
    }
    if (payload.proficiency_level != null) {
        body.proficiency_level = payload.proficiency_level;
    }
    if (payload.years_experience !== undefined) {
        body.years_experience = payload.years_experience ?? null;
    }
    return body;
}

/** Fallback si le POST renvoie un JSON minimal sans objet `skill` structuré. */
function skillFromAddResponse(
    root: Record<string, unknown>,
    body: ReturnType<typeof serializeAddTalentSkillBody>,
): RhTalentSkill {
    const parsed = parseSkill(root.skill ?? root.data ?? root);
    if (parsed) return parsed;
    const id = str(root.id ?? root.talent_skill_id ?? root.skill_assignment_id);
    return {
        id: id || `added-${Date.now()}`,
        skill_id: str(root.skill_id) || null,
        skill_name: str(root.skill_name) || body.skill_name,
        skill_category: str(root.skill_category ?? root.category) || body.skill_category,
        proficiency_level: num(root.proficiency_level ?? root.level, body.proficiency_level),
        years_experience:
            root.years_experience != null ? num(root.years_experience) : body.years_experience,
    };
}

function parseSkill(row: unknown): RhTalentSkill | null {
    const r = asRecord(row);
    const id = str(r.id ?? r.talent_skill_id ?? r.skill_assignment_id);
    const skill_name = str(r.skill_name ?? r.name);
    if (!id && !skill_name) return null;
    return {
        id: id || skill_name,
        skill_id: str(r.skill_id) || null,
        skill_name,
        skill_category: str(r.skill_category ?? r.category) || null,
        proficiency_level: num(r.proficiency_level ?? r.level, 0),
        years_experience: r.years_experience != null ? num(r.years_experience) : null,
        is_gap: Boolean(r.is_gap ?? r.gap),
    };
}

function parseSummary(raw: unknown, skills: RhTalentSkill[]): RhTalentSkillsSummary {
    const r = asRecord(raw);
    const total = num(r.total ?? r.count, skills.length);
    const avg_level = num(
        r.avg_level ?? r.average_level ?? r.avg_proficiency,
        skills.length ? skills.reduce((s, x) => s + x.proficiency_level, 0) / skills.length : 0,
    );
    const top_category =
        str(r.top_category ?? r.topCategory) ||
        (() => {
            const counts: Record<string, number> = {};
            for (const sk of skills) {
                const c = sk.skill_category || "Autre";
                counts[c] = (counts[c] ?? 0) + 1;
            }
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        })();
    const gaps_count = num(r.gaps_count ?? r.gaps, skills.filter((s) => s.is_gap).length);
    return { total, avg_level, top_category, gaps_count };
}

function normalizeSkillsResponse(raw: unknown): RhTalentSkillsResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new RhTalentSkillApiError(messageFromBody(raw, "Impossible de charger les compétences"), {
            code: str(root.code),
            httpStatus: 400,
        });
    }
    const skillsRaw = root.skills ?? root.data ?? root.items;
    const skills = Array.isArray(skillsRaw)
        ? skillsRaw.map(parseSkill).filter((x): x is RhTalentSkill => x != null)
        : [];
    const summary = parseSummary(root.summary ?? root.stats ?? root, skills);
    return { skills, summary };
}

async function parseJsonResponse(res: Response, fallback: string): Promise<unknown> {
    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }
    if (!res.ok) {
        const root = unwrapN8nRoot(json);
        throw new RhTalentSkillApiError(messageFromBody(json, fallback), {
            code: str(root.code),
            httpStatus: res.status,
        });
    }
    return json;
}

/** @deprecated Alias — même URL que `rhTalentSkillsGetUrl`. */
export function rhTalentSkillsListUrl(talentId: string): string {
    return rhTalentSkillsGetUrl(talentId);
}

/** GET compétences d'un talent */
export async function getTalentSkills(
    talentId: string,
    options?: RhTalentSkillsFetchOptions,
): Promise<RhTalentSkillsResponse> {
    const id = assertRhTalentId(talentId);
    console.log("[RH Skills] Fetching skills for talent", id);

    const url = rhTalentSkillsGetUrl(id);
    logRhSkillsUrl("GET", url, id);

    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    if (!res.ok) {
        let json: unknown = {};
        try {
            json = await res.json();
        } catch {
            json = {};
        }
        throw new RhTalentSkillApiError(
            messageFromBody(json, "Impossible de charger les compétences"),
            { httpStatus: res.status },
        );
    }

    const json = await res.json();
    return normalizeSkillsResponse(json);
}

/** POST compétence — webhook ADD + corps `skill_name` / `skill_category` / `proficiency_level` / `years_experience`. */
export async function addTalentSkill(
    talentId: string,
    payload: AddRhTalentSkillPayload,
    options?: RhTalentSkillsFetchOptions,
): Promise<RhTalentSkill> {
    const id = assertRhTalentId(talentId);
    const url = rhTalentSkillsAddUrl(id);
    const body = serializeAddTalentSkillBody(payload);
    logRhSkillsUrl("POST", url, id);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify(body),
    });
    const json = await parseJsonResponse(res, "Impossible d’ajouter la compétence");
    const root = unwrapN8nRoot(json);
    if (root.status === "error") {
        throw new RhTalentSkillApiError(messageFromBody(json, "Impossible d’ajouter la compétence"), {
            code: str(root.code),
            httpStatus: res.status,
        });
    }
    return skillFromAddResponse(root, body);
}

/** PATCH compétence */
export async function updateTalentSkill(
    talentId: string,
    skillId: string,
    payload: UpdateRhTalentSkillPayload,
    options?: RhTalentSkillsFetchOptions,
): Promise<RhTalentSkill> {
    const tid = assertRhTalentId(talentId);
    const sid = assertRhSkillId(skillId);
    const url = rhTalentSkillUpdateUrl(tid, sid);
    const body = serializeUpdateTalentSkillBody(payload);
    logRhSkillsUrl("PATCH", url, tid, sid);

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify(body),
    });
    const json = await parseJsonResponse(res, "Impossible de modifier la compétence");
    const root = unwrapN8nRoot(json);
    const skill = parseSkill(root.skill ?? root.data ?? root);
    if (!skill) {
        throw new RhTalentSkillApiError("Réponse modification compétence invalide", { httpStatus: res.status });
    }
    return skill;
}

/** DELETE compétence */
export async function deleteTalentSkill(
    talentId: string,
    skillId: string,
    options?: RhTalentSkillsFetchOptions,
): Promise<void> {
    const tid = assertRhTalentId(talentId);
    const sid = assertRhSkillId(skillId);
    const url = rhTalentSkillDeleteUrl(tid, sid);
    logRhSkillsUrl("DELETE", url, tid, sid);

    const res = await fetch(url, {
        method: "DELETE",
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });
    if (!res.ok) {
        let json: unknown = {};
        try {
            json = await res.json();
        } catch {
            json = {};
        }
        throw new RhTalentSkillApiError(messageFromBody(json, "Impossible de supprimer la compétence"), {
            httpStatus: res.status,
        });
    }
}

