import { useMutation } from "@tanstack/react-query";
import { getWhatIfErrorCode, runWhatIfSimulation } from "@/api/whatif.api";
import type { WhatIfRequest, WhatIfResponse } from "@/api/whatif.types";
import { useToast } from "@/providers/toast-provider";

const WHAT_IF_ERROR_MESSAGES: Record<string, string> = {
    baseline_missing: "Pas de score initial — lance d'abord une analyse normale du projet.",
    validation_failed: "Paramètres invalides (allocation entre 0 et 200 %).",
    forbidden: "Ce projet n'appartient pas à ton enterprise.",
    orchestrator_error: "L'orchestrateur a échoué. Réessaie dans quelques secondes.",
};

export function useWhatIfSimulation() {
    const { push: toast } = useToast();

    return useMutation<WhatIfResponse, Error, WhatIfRequest>({
        mutationFn: runWhatIfSimulation,
        onError: (err) => {
            const code = getWhatIfErrorCode(err);
            toast(WHAT_IF_ERROR_MESSAGES[code ?? ""] ?? `Erreur simulation : ${err.message}`, "error");
        },
    });
}
