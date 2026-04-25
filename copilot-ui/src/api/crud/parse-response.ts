import type { AnalysisRefreshPayload, CrudMutationResult } from "@/types/crud-domain";

export function normalizeListPayload(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
        const o = payload as Record<string, unknown>;
        if (Array.isArray(o.data)) return o.data;
        if (Array.isArray(o.items)) return o.items;
        if (Array.isArray(o.results)) return o.results;
    }
    return [];
}

export function unwrapEntity<T>(payload: unknown): T {
    if (payload && typeof payload === "object" && "data" in payload) {
        const d = (payload as { data: unknown }).data;
        if (d !== undefined) return d as T;
    }
    return payload as T;
}

function isAnalysisRefresh(v: unknown): v is AnalysisRefreshPayload {
    return v != null && typeof v === "object";
}

export function parseMutationResult<T>(payload: unknown): CrudMutationResult<T> {
    if (payload == null || typeof payload !== "object") {
        return {
            raw: payload,
            data: payload as T | undefined,
            message: undefined,
            analysisRefresh: undefined,
        };
    }
    const o = payload as Record<string, unknown>;
    const data = o.data !== undefined ? (o.data as T) : (payload as T);
    const message = typeof o.message === "string" ? o.message : undefined;
    const analysisRefresh = isAnalysisRefresh(o.analysis_refresh) ? o.analysis_refresh : undefined;
    return { raw: payload, data, message, analysisRefresh };
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "") continue;
        sp.set(k, String(v));
    }
    const q = sp.toString();
    return q ? `?${q}` : "";
}
