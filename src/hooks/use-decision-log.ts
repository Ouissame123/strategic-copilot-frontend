import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiGet } from "@/utils/apiClient";
import { normalizeDecision } from "@/utils/decisionConfig";

export type DecisionType = "Continue" | "Adjust" | "Stop";

export interface DecisionLogEntry {
    id: string;
    date: string;
    project_id?: string;
    score: number;
    decision: DecisionType;
    justification: string;
    rules_version?: string;
}

function toNumber(v: unknown, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function extractEntries(payload: unknown): DecisionLogEntry[] {
    if (Array.isArray(payload)) {
        return payload.map((item, i) => {
            const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            return {
                id: String(r.id ?? `log-${i + 1}`),
                date: String(r.date ?? r.created_at ?? new Date().toISOString()),
                project_id: r.project_id != null ? String(r.project_id) : undefined,
                score: toNumber(r.score ?? r.viability_score, 0),
                decision: normalizeDecision(r.decision),
                justification: String(r.justification ?? r.explanation ?? ""),
                rules_version: r.rules_version != null ? String(r.rules_version) : undefined,
            };
        });
    }
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        if (Array.isArray(record.items)) return extractEntries(record.items);
        if (Array.isArray(record.entries)) return extractEntries(record.entries);
    }
    return [];
}

const DEFAULT_TIMEOUT = 15000;

export function useDecisionLog(options: { timeout?: number } = {}) {
    const { timeout = DEFAULT_TIMEOUT } = options;
    const [entries, setEntries] = useState<DecisionLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLog = useCallback(
        async (signal?: AbortSignal) => {
            setIsLoading(true);
            setError(null);
            try {
                const payload = await apiGet<unknown>("/api/project/decision-log", { timeout, signal });
                setEntries(extractEntries(payload));
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setEntries([]);
                setError(err instanceof ApiError ? err.message : "Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        },
        [timeout],
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
            retry,
        }),
        [entries, isLoading, error, retry],
    );
}
