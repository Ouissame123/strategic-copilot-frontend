import { isAxiosError } from "axios";
import { API_CONFIG } from "@/config/api.config";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    WhatIfFieldErrors,
    WhatIfFieldKey,
    WhatIfModifications,
    WhatIfRequest,
    WhatIfResponse,
} from "@/api/whatif.types";
import { logWhatIf } from "@/api/whatif-debug";

/** Path n8n — même pattern que les autres endpoints manager (`/webhook/api/project/...`). */
export const WHAT_IF_PATH = "/webhook/api/project/what-if";

const silent: HttpClientRequestConfig = {
    skipGlobalHttpErrorToast: true,
    timeout: API_CONFIG.WHAT_IF_TIMEOUT_MS,
};

function readResponseBody(err: unknown): Record<string, unknown> | null {
    if (!isAxiosError(err)) return null;
    const data = err.response?.data;
    if (data != null && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
    }
    return null;
}

export function getWhatIfErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    if (err.code === "ECONNABORTED" || err.message.toLowerCase().includes("timeout")) {
        return "timeout";
    }
    const status = err.response?.status;
    const o = readResponseBody(err);
    const bodyCode = o ? String(o.code ?? o.error ?? "").trim().toLowerCase() : "";

    if (status === 404 || bodyCode === "baseline_missing") return "baseline_missing";
    if (status === 403 || bodyCode === "forbidden") return "forbidden";
    if (status === 400 || bodyCode === "validation_failed") return "validation_failed";
    if (status === 500 || bodyCode === "observer_error" || bodyCode === "orchestrator_error") {
        return bodyCode === "orchestrator_error" ? "orchestrator_error" : "observer_error";
    }

    if (bodyCode) return bodyCode;
    if (o) {
        const message = String(o.message ?? "").toLowerCase();
        if (message.includes("baseline")) return "baseline_missing";
    }
    return undefined;
}

/** Message backend exact (403 / 500 / générique) — pas de reformulation. */
export function getWhatIfErrorMessage(err: unknown): string {
    const o = readResponseBody(err);
    if (o) {
        const msg = o.message ?? o.error_description ?? o.detail;
        if (msg != null && String(msg).trim()) return String(msg).trim();
    }
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return "Erreur simulation.";
}

function inferFieldFromErrorText(text: string): WhatIfFieldKey {
    const t = text.toLowerCase();
    if (t.includes("allocation")) return "allocation_pct";
    if (t.includes("talent") || t.includes("added_talent")) return "added_talent_id";
    if (t.includes("training") || t.includes("skill") || t.includes("competence") || t.includes("compétence")) {
        return "training_skill_id";
    }
    return "_form";
}

/**
 * Mappe `errors[]` (400 validation_failed) vers les champs du formulaire.
 * Accepte strings libres ou objets `{ field|path, message }`.
 */
export function parseWhatIfValidationErrors(err: unknown): WhatIfFieldErrors {
    const o = readResponseBody(err);
    const raw = o?.errors;
    const out: WhatIfFieldErrors = {};

    const assign = (field: WhatIfFieldKey, message: string) => {
        const msg = message.trim();
        if (!msg) return;
        out[field] = out[field] ? `${out[field]} ${msg}` : msg;
    };

    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (typeof item === "string") {
                assign(inferFieldFromErrorText(item), item);
                continue;
            }
            if (item != null && typeof item === "object") {
                const r = item as Record<string, unknown>;
                const fieldRaw = String(r.field ?? r.path ?? r.name ?? "").trim();
                const message = String(r.message ?? r.msg ?? r.error ?? item).trim();
                const normalized = fieldRaw
                    .replace(/^modifications\./i, "")
                    .replace(/^body\./i, "")
                    .toLowerCase();
                let key: WhatIfFieldKey = "_form";
                if (normalized.includes("allocation")) key = "allocation_pct";
                else if (normalized.includes("talent")) key = "added_talent_id";
                else if (normalized.includes("training") || normalized.includes("skill")) key = "training_skill_id";
                else if (message) key = inferFieldFromErrorText(message);
                assign(key, message || fieldRaw);
            }
        }
    }

    if (Object.keys(out).length === 0) {
        const fallback = getWhatIfErrorMessage(err);
        if (fallback) out._form = fallback;
    }
    return out;
}

/** Négatif / positif autorisés — pas de clamp métier côté client. */
export function sanitizeWhatIfModifications(modifications: WhatIfModifications): WhatIfModifications {
    const allocation = Number(modifications.allocation_pct);
    const body: WhatIfModifications = {
        allocation_pct: Number.isFinite(allocation) ? allocation : 0,
        added_talent_id: null,
        training_skill_id: null,
    };
    const talent = modifications.added_talent_id;
    if (typeof talent === "string" && talent.trim()) body.added_talent_id = talent.trim();
    const skill = modifications.training_skill_id;
    if (typeof skill === "string" && skill.trim()) body.training_skill_id = skill.trim();
    return body;
}

export async function runWhatIfSimulation(req: WhatIfRequest): Promise<WhatIfResponse> {
    const body = {
        project_id: req.project_id.trim(),
        modifications: sanitizeWhatIfModifications(req.modifications),
    };
    logWhatIf("1/6 — avant appel HTTP POST", { url: WHAT_IF_PATH, body, timeoutMs: API_CONFIG.WHAT_IF_TIMEOUT_MS });
    try {
        const response = await httpClient.post<WhatIfResponse>(WHAT_IF_PATH, body, silent);
        logWhatIf("2/6 — réponse HTTP reçue", {
            status: response.status,
            statusText: response.statusText,
            hasData: response.data != null,
        });
        const data = response.data;
        logWhatIf("3/6 — corps JSON parsé (axios)", {
            status: (data as WhatIfResponse | null)?.status,
            score_before: (data as WhatIfResponse | null)?.score_before,
            score_after: (data as WhatIfResponse | null)?.score_after,
            decision_changed: (data as WhatIfResponse | null)?.decision_changed,
            llm_enriched: (data as WhatIfResponse | null)?.llm_enriched,
        });
        logWhatIf("4/6 — avant retour Promise (→ React Query onSuccess)");
        return data;
    } catch (err) {
        logWhatIf("catch — erreur HTTP / réseau / timeout", {
            code: isAxiosError(err) ? err.code : undefined,
            message: err instanceof Error ? err.message : String(err),
            status: isAxiosError(err) ? err.response?.status : undefined,
            whatIfCode: getWhatIfErrorCode(err),
        });
        throw err;
    }
}

/** @deprecated Préférer `runWhatIfSimulation` */
export const managerWhatIfApi = {
    simulate: (projectId: string, modifications: WhatIfModifications) =>
        runWhatIfSimulation({
            project_id: projectId,
            modifications: {
                allocation_pct: modifications.allocation_pct,
                added_talent_id: modifications.added_talent_id ?? null,
                training_skill_id: modifications.training_skill_id ?? null,
            },
        }).then((data) => ({ data })),
};

export type { WhatIfModifications as ManagerWhatIfModifications };
export type ManagerWhatIfResponse = WhatIfResponse;
export type WhatIfBreakdown = import("@/api/whatif.types").ScoreBreakdown;
