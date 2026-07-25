import { useMutation } from "@tanstack/react-query";
import { orchestratorApi } from "@/api/orchestrator.api";
import { getWhatIfErrorCode } from "@/api/whatif.api";
import { logWhatIf } from "@/api/whatif-debug";
import type { WhatIfMutationVariables, WhatIfResult } from "@/types/api.types";
import { useToast } from "@/providers/toast-provider";

const WHAT_IF_ERROR_MESSAGES: Record<string, string> = {
    baseline_missing: "Pas de score initial — lance d'abord une analyse normale du projet.",
    validation_failed: "Paramètres invalides.",
    forbidden: "Ce projet n'appartient pas à ton enterprise.",
    orchestrator_error: "L'orchestrateur a échoué. Réessaie dans quelques secondes.",
    timeout: "La simulation a dépassé le délai d'attente (~2 min). Réessaie si le workflow n8n est lent.",
};

export const useWhatIf = () => {
    const { push: toast } = useToast();

    return useMutation<WhatIfResult, unknown, WhatIfMutationVariables>({
        mutationFn: async ({ projectId, modifications }) => {
            logWhatIf("5/6 — useWhatIf mutationFn démarrée", { projectId, modifications });
            const r = await orchestratorApi.whatIf(projectId, modifications);
            logWhatIf("6/6 — useWhatIf mutationFn résolue", { status: r.status, hasData: r.data != null });
            return r.data;
        },
        onError: (err) => {
            logWhatIf("onError useWhatIf", err);
            const code = getWhatIfErrorCode(err);
            const message =
                err instanceof Error ? err.message : "Erreur inconnue";
            toast(WHAT_IF_ERROR_MESSAGES[code ?? ""] ?? `Erreur simulation : ${message}`, "error");
        },
    });
};
