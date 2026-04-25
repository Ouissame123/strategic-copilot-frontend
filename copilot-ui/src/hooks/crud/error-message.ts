import { ApiError } from "@/utils/apiClient";

/** Extrait un libellé lisible depuis une réponse JSON d’erreur (n8n, API REST, etc.). */
function messageFromPayload(payload: unknown): string | null {
    if (payload == null) return null;
    if (typeof payload === "string") {
        const t = payload.trim();
        if (!t) return null;
        return t.length > 400 ? `${t.slice(0, 397)}…` : t;
    }
    if (typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "msg", "description"] as const) {
        const v = o[key];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    const nested = o.data;
    if (nested && typeof nested === "object") {
        const d = nested as Record<string, unknown>;
        const m = d.message ?? d.error;
        if (typeof m === "string" && m.trim()) return m.trim();
    }
    return null;
}

export function toUserMessage(err: unknown): string {
    if (err instanceof ApiError) {
        const fromBody = messageFromPayload(err.payload);
        if (fromBody) return fromBody;
        return err.message;
    }
    if (err instanceof Error) return err.message;
    return "Erreur inconnue";
}
