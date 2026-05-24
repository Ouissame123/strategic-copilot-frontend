/**
 * RH Employment — GET/PUT via URLs n8n production (webhookId dans le chemin).
 * Configurer `VITE_RH_EMPLOYMENT_GET_URL` et `VITE_RH_EMPLOYMENT_PUT_URL` (placeholder `{id}`).
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import { parseFlexibleDateToIso, parseSalaryToNumber } from "@/lib/rh-date-iso";
import type {
    EmploymentData,
    EmploymentManager,
    EmploymentResponse,
    UpdateEmploymentPayload,
} from "@/types/rh-employment.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RhTalentEmploymentFetchOptions = ApiClientOptions & {
    token?: string | null;
    /** @deprecated Ignoré — URLs depuis VITE_RH_EMPLOYMENT_*_URL. */
    apiBase?: string;
};

const PLACEHOLDER_TALENT_IDS = new Set([":id", ":talent_id", "{id}", "{talentId}"]);

const ID_PLACEHOLDER_RE = /\{id\}|\{talentId\}|:id|:talent_id/gi;

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function numOrNull(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function employmentEnvTemplate(kind: "GET" | "PUT"): string {
    const key = kind === "GET" ? "VITE_RH_EMPLOYMENT_GET_URL" : "VITE_RH_EMPLOYMENT_PUT_URL";
    const fromEnv = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
    if (!fromEnv) {
        throw new RhTalentEmploymentApiError(
            `${key} manquant — configurez l’URL webhook n8n WF_RH_Employment (placeholder {id}).`,
            { code: "MISSING_EMPLOYMENT_URL" },
        );
    }
    return fromEnv;
}

/** Remplace `{id}`, `{talentId}`, `:id` par l’UUID talent (jamais laisser `:id` dans l’URL finale). */
export function resolveRhEmploymentUrl(template: string, talentId: string): string {
    const id = assertRhEmploymentTalentId(talentId);
    let url = template.trim().replace(ID_PLACEHOLDER_RE, id);
    if (/\{id\}|\{talentId\}|:id|:talent_id/i.test(url)) {
        throw new RhTalentEmploymentApiError("URL employment invalide — placeholder {id} non remplacé.", {
            code: "INVALID_EMPLOYMENT_URL",
        });
    }
    return url;
}

export function rhTalentEmploymentGetUrl(talentId: string): string {
    return resolveRhEmploymentUrl(employmentEnvTemplate("GET"), talentId);
}

export function rhTalentEmploymentPutUrl(talentId: string): string {
    return resolveRhEmploymentUrl(employmentEnvTemplate("PUT"), talentId);
}

function collectMessageCandidates(root: Record<string, unknown>): string[] {
    const out: string[] = [];
    const push = (v: unknown) => {
        const s = str(v);
        if (s) out.push(s);
    };

    push(root.message);
    push(root.error);
    push(root.detail);
    push(root.description);
    push(root.reason);
    push(root.hint);
    push(root.msg);

    const nested = asRecord(root.data);
    push(nested.message);
    push(nested.error);
    push(nested.detail);

    const errField = root.errors;
    if (typeof errField === "string") push(errField);
    if (Array.isArray(errField)) {
        for (const item of errField) {
            if (typeof item === "string") push(item);
            else if (item && typeof item === "object") {
                const o = item as Record<string, unknown>;
                push(o.message ?? o.msg ?? o.error);
            }
        }
    }

    return out;
}

function messageFromPlainText(text: string): string | null {
    const t = text.trim();
    if (!t || t.length > 4000) return null;
    const lower = t.toLowerCase();
    if (lower.includes("workflow execution failed")) {
        return "Le workflow WF_RH_Employment a échoué sur n8n — ouvrez l’exécution dans n8n pour le détail.";
    }
    if (t.startsWith("{") || t.startsWith("[")) {
        try {
            const parsed = JSON.parse(t) as unknown;
            const fromJson = messageFromBody(parsed);
            if (fromJson) return fromJson;
        } catch {
            /* texte brut */
        }
    }
    if (!t.startsWith("<")) return t;
    return null;
}

export function messageFromBody(raw: unknown, res?: Response, plainText?: string): string {
    const candidates: string[] = [];

    const fromText = plainText ? messageFromPlainText(plainText) : null;
    if (fromText) candidates.push(fromText);

    if (typeof raw === "string" && raw.trim()) {
        candidates.push(raw.trim());
    } else if (raw && typeof raw === "object") {
        const root = unwrapN8nRoot(raw);
        candidates.push(...collectMessageCandidates(root));
        if (Array.isArray(raw) && raw.length > 0) {
            const nested = messageFromBody(raw[0]);
            if (nested) candidates.push(nested);
        }
    }

    for (const c of candidates) {
        if (c) return c;
    }

    if (res?.status === 500) {
        return "Erreur serveur (500) — consultez l’exécution n8n WF_RH_Employment.";
    }

    if (res) {
        const statusLine = [res.status, res.statusText].filter(Boolean).join(" ");
        if (statusLine.trim()) return `Erreur HTTP ${statusLine}`;
    }

    return "";
}

export class RhTalentEmploymentApiError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhTalentEmploymentApiError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhTalentEmploymentApiError(err: unknown): string {
    if (err instanceof RhTalentEmploymentApiError) return err.message;
    const raw = err instanceof Error ? err.message : String(err);
    return raw || "Erreur lors de l’enregistrement du contrat";
}

export function assertRhEmploymentTalentId(talentId: string): string {
    const id = talentId?.trim() ?? "";
    if (!id || PLACEHOLDER_TALENT_IDS.has(id)) {
        throw new RhTalentEmploymentApiError("Identifiant talent invalide.", { code: "INVALID_TALENT_ID" });
    }
    return id;
}

async function readResponseBody(res: Response): Promise<{ json: unknown; text: string }> {
    const text = await res.text();
    if (!text.trim()) return { json: {}, text: "" };
    try {
        return { json: JSON.parse(text) as unknown, text };
    } catch {
        return { json: {}, text };
    }
}

function throwHttpError(res: Response, json: unknown, text: string, fallback: string): never {
    const msg = messageFromBody(json, res, text) || fallback;
    const root = unwrapN8nRoot(json);
    throw new RhTalentEmploymentApiError(msg, {
        code: str(root.code),
        httpStatus: res.status,
    });
}

async function employmentFetch(
    url: string,
    init: RequestInit,
    options?: RhTalentEmploymentFetchOptions,
): Promise<{ res: Response; json: unknown; text: string }> {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            ...(init.headers as Record<string, string> | undefined),
        },
        credentials: "omit",
        signal: options?.signal,
    });
    const { json, text } = await readResponseBody(res);
    return { res, json, text };
}

function normalizeDateField(value: string): string | null {
    if (!value) return null;
    return parseFlexibleDateToIso(value) ?? value;
}

function parseEmploymentData(raw: unknown): EmploymentData | null {
    const r = asRecord(raw);
    if (!Object.keys(r).length) return null;
    const role = str(r.role);
    const contract_type = str(r.contract_type);
    const integration_date = normalizeDateField(str(r.integration_date));
    const contract_end_date = normalizeDateField(str(r.contract_end_date));
    const salary = r.salary ?? null;
    const tenure_years = numOrNull(r.tenure_years);
    const tenure_months = numOrNull(r.tenure_months);

    if (!role && !contract_type && salary == null && !integration_date && !contract_end_date) {
        return null;
    }

    return {
        role: role || null,
        contract_type: contract_type || null,
        salary,
        integration_date: integration_date || null,
        contract_end_date: contract_end_date || null,
        tenure_years,
        tenure_months,
    };
}

function parseManager(raw: unknown): EmploymentManager | null {
    const r = asRecord(raw);
    if (!Object.keys(r).length) return null;
    const manager_id = str(r.manager_id ?? r.id ?? r.user_id);
    const manager_name = str(r.manager_name ?? r.full_name ?? r.name);
    const manager_email = str(r.manager_email ?? r.email);
    if (!manager_id && !manager_name && !manager_email) return null;
    return {
        manager_id: manager_id || null,
        manager_name: manager_name || null,
        manager_email: manager_email || null,
    };
}

function normalizeEmploymentResponse(raw: unknown): EmploymentResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error" || root.success === false) {
        const msg = messageFromBody(raw) || "Le serveur a refusé l’opération sur le contrat.";
        throw new RhTalentEmploymentApiError(msg, {
            code: str(root.code),
            httpStatus: 400,
        });
    }

    const data = asRecord(root.data);
    const employmentRaw = root.employment ?? data.employment ?? null;
    const managerRaw = root.manager ?? data.manager ?? null;

    const employment = employmentRaw ? parseEmploymentData(employmentRaw) : null;
    const manager = managerRaw ? parseManager(managerRaw) : null;

    const success = root.success === true || root.status === "success" || employment != null;

    return {
        success,
        employment,
        manager,
        message: str(root.message) || undefined,
    };
}

function serializeUpdatePayload(payload: UpdateEmploymentPayload): Record<string, unknown> {
    const integration_date = parseFlexibleDateToIso(payload.integration_date);
    if (!integration_date) {
        throw new RhTalentEmploymentApiError(
            "Date d’intégration invalide — utilisez JJ/MM/AAAA ou AAAA-MM-JJ.",
            { code: "INVALID_INTEGRATION_DATE" },
        );
    }

    const salary = parseSalaryToNumber(payload.salary);
    if (!Number.isFinite(salary) || salary <= 0) {
        throw new RhTalentEmploymentApiError("Rémunération invalide — saisissez un montant strictement positif.", {
            code: "INVALID_SALARY",
        });
    }

    const contract_type = str(payload.contract_type).toUpperCase().replace(/\s+/g, "_");
    const role = str(payload.role);
    const endRaw = str(payload.contract_end_date ?? "");
    const contract_end_date = endRaw ? parseFlexibleDateToIso(endRaw) ?? "" : "";

    if (endRaw && !contract_end_date) {
        throw new RhTalentEmploymentApiError(
            "Date de fin de contrat invalide — utilisez JJ/MM/AAAA ou AAAA-MM-JJ.",
            { code: "INVALID_CONTRACT_END_DATE" },
        );
    }

    return {
        role,
        salary,
        contract_type,
        integration_date,
        contract_end_date,
    };
}

/** GET — webhook WF_RH_Employment (GET). */
export async function getTalentEmployment(
    talentId: string,
    options?: RhTalentEmploymentFetchOptions,
): Promise<EmploymentResponse> {
    const url = rhTalentEmploymentGetUrl(talentId);
    console.log("[RH Employment GET]", url);

    const { res, json, text } = await employmentFetch(url, { method: "GET" }, options);

    if (res.status === 404) {
        return {
            success: true,
            employment: null,
            manager: null,
            notConfigured: true,
            message: "Contrat non configuré",
        };
    }

    if (!res.ok) {
        throwHttpError(res, json, text, "Impossible de charger l’emploi");
    }

    return normalizeEmploymentResponse(json);
}

/** PUT — webhook WF_RH_Employment (PUT), jamais POST. */
export async function updateTalentEmployment(
    talentId: string,
    payload: UpdateEmploymentPayload,
    options?: RhTalentEmploymentFetchOptions,
): Promise<EmploymentResponse> {
    const url = rhTalentEmploymentPutUrl(talentId);
    const body = serializeUpdatePayload(payload);
    console.log("[RH Employment PUT]", url, body);

    const { res, json, text } = await employmentFetch(
        url,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
        options,
    );

    if (res.status === 404) {
        throw new RhTalentEmploymentApiError(
            "Webhook employment introuvable (404) — vérifiez VITE_RH_EMPLOYMENT_PUT_URL.",
            { httpStatus: 404 },
        );
    }

    if (!res.ok) {
        throwHttpError(res, json, text, "Erreur lors de l’enregistrement du contrat");
    }

    return normalizeEmploymentResponse(json);
}

/** DELETE — même webhook PUT si aucune URL DELETE dédiée. */
export async function deleteTalentEmployment(
    talentId: string,
    options?: RhTalentEmploymentFetchOptions,
): Promise<void> {
    const url = rhTalentEmploymentPutUrl(talentId);
    console.log("[RH Employment DELETE]", url);

    const { res, json, text } = await employmentFetch(url, { method: "DELETE" }, options);

    if (res.status === 404) return;

    if (!res.ok) {
        throwHttpError(res, json, text, "Impossible de supprimer le contrat");
    }
}

/** @deprecated Alias PUT — ne jamais POST. */
export const createTalentEmployment = updateTalentEmployment;
