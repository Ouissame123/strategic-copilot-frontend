import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProjectTalentMatching } from "@/api/project-talent-matching.api";
import type { TalentMatchingResult } from "@/types/talent-matching";
import { ApiError, getHttpTimeoutMs } from "@/utils/apiClient";

export function useTalentMatching(projectId: string | undefined) {
    const [data, setData] = useState<TalentMatchingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetch = useCallback(
        async (signal?: AbortSignal) => {
            const id = projectId?.trim();
            if (!id) {
                setData(null);
                setError(null);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const result = await fetchProjectTalentMatching(id, { timeout: getHttpTimeoutMs(), signal });
                if (result) {
                    setData(result);
                    setError(null);
                } else {
                    setData(null);
                    setError("Réponse matching talents invalide ou statut non « success ».");
                }
            } catch (e) {
                if (e instanceof Error && e.name === "AbortError") return;
                setData(null);
                setError(e instanceof ApiError ? e.message : "Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        },
        [projectId],
    );

    useEffect(() => {
        const c = new AbortController();
        void fetch(c.signal);
        return () => c.abort();
    }, [fetch]);

    const retry = useCallback(() => void fetch(), [fetch]);

    return useMemo(
        () => ({
            data,
            error,
            isLoading,
            retry,
        }),
        [data, error, isLoading, retry],
    );
}
