import { useCallback, useState } from "react";
import { saveCopilotDecision } from "@/api/copilot.api";
import type { SaveCopilotDecisionPayload } from "@/types/copilot";
import { ApiError } from "@/utils/apiClient";

export interface UseCopilotDecisionResult {
    loading: boolean;
    error: string | null;
    saveDecision: (payload: SaveCopilotDecisionPayload) => Promise<void>;
    resetError: () => void;
}

/**
 * POST /api/copilot/decision — pas de mise à jour locale fictive.
 */
export function useCopilotDecision(): UseCopilotDecisionResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveDecision = useCallback(async (payload: SaveCopilotDecisionPayload) => {
        setLoading(true);
        setError(null);
        try {
            await saveCopilotDecision(payload);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Échec de l’enregistrement.";
            setError(msg);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    const resetError = useCallback(() => setError(null), []);

    return { loading, error, saveDecision, resetError };
}
