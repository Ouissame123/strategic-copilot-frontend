import { useCallback, useEffect, useMemo, useState } from "react";
import { getDecisionLogUrl } from "@/config/project-api";
import { ApiError } from "@/api/errors";
import { apiGet, getHttpTimeoutMs } from "@/utils/apiClient";
import { normalizeDecision } from "@/utils/decisionConfig";
import { useAuth } from "@/providers/auth-provider";

export type DecisionType = "Continue" | "Adjust" | "Stop";

export interface DecisionLogEntry {
    id: string;
    date: string;
    project_id?: string;
    /** Libellé projet si fourni par l’API. */
    project_name?: string;
    score: number;
    decision: DecisionType;
    justification: string;
    rules_version?: string;
    /** Champs optionnels renvoyés par n8n — affichage brut. */
    confidence?: number | null;
    health_score?: number | null;
    author?: string | null;
}

function toNumber(v: unknown, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function extractEntries(payload: unknown): DecisionLogEntry[] {
    if (Array.isArray(payload)) {
        return payload.flatMap((item) => {
            const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            if (r.id == null || r.date == null) return [];
            const score = toNumber(r.score ?? r.viability_score, Number.NaN);
            if (!Number.isFinite(score)) return [];
            const confRaw = r.confidence ?? r.confidence_score;
            const conf =
                confRaw != null && confRaw !== ""
                    ? toNumber(confRaw, Number.NaN)
                    : Number.NaN;
            const healthRaw = r.health_score ?? r.project_health_score ?? r.sante_projet;
            const health =
                healthRaw != null && healthRaw !== ""
                    ? toNumber(healthRaw, Number.NaN)
                    : Number.NaN;
            const entry: DecisionLogEntry = {
                id: String(r.id),
                date: String(r.date),
                project_id: r.project_id != null ? String(r.project_id) : undefined,
                project_name:
                    r.project_name != null
                        ? String(r.project_name).trim()
                        : r.project != null && typeof r.project === "object"
                          ? String((r.project as Record<string, unknown>).name ?? "").trim() || undefined
                          : undefined,
                score,
                decision: normalizeDecision(r.decision),
                justification: r.justification != null ? String(r.justification) : r.explanation != null ? String(r.explanation) : "",
                rules_version: r.rules_version != null ? String(r.rules_version) : undefined,
                confidence: Number.isFinite(conf) ? conf : null,
                health_score: Number.isFinite(health) ? health : null,
                author:
                    r.author != null
                        ? String(r.author)
                        : r.created_by != null
                          ? String(r.created_by)
                          : r.actor != null
                            ? String(r.actor)
                            : null,
            };
            return [entry];
        });
    }
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        if (Array.isArray(record.items)) return extractEntries(record.items);
        if (Array.isArray(record.entries)) return extractEntries(record.entries);
    }
    return [];
}

function decisionLogPathForRole(role: string | undefined): string {
    if (role === "manager") return "/api/workspace/manager/decision-log";
    return getDecisionLogUrl();
}

export function useDecisionLog(options: { timeout?: number } = {}) {
    const { timeout = getHttpTimeoutMs() } = options;
    const { user } = useAuth();
    const [entries, setEntries] = useState<DecisionLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    const fetchLog = useCallback(
        async (signal?: AbortSignal) => {
            setIsLoading(true);
            setError(null);
            setErrorStatus(null);
            try {
                const path = decisionLogPathForRole(user?.role);
                const payload = await apiGet<unknown>(path, { timeout, signal });
                setEntries(extractEntries(payload));
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setEntries([]);
                if (err instanceof ApiError) {
                    setError(err.message);
                    setErrorStatus(typeof err.status === "number" ? err.status : null);
                } else {
                    setError("Erreur de connexion");
                    setErrorStatus(null);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [timeout, user?.role],
    );

    useEffect(() => {
        const c = new AbortController();
        void fetchLog(c.signal);
        return () => c.abort();
    }, [fetchLog]);

    const retry = useCallback(() => void fetchLog(), [fetchLog]);

    return useMemo(
        () => ({
            entries,
            isLoading,
            error,
            errorStatus,
            retry,
        }),
        [entries, isLoading, error, errorStatus, retry],
    );
}
