import { useMutation } from "@tanstack/react-query";
import { getWhatIfErrorCode, getWhatIfErrorMessage, runWhatIfSimulation } from "@/api/whatif.api";
import { logWhatIf } from "@/api/whatif-debug";
import type { WhatIfRequest, WhatIfResponse } from "@/api/whatif.types";
import { useToast } from "@/providers/toast-provider";

/**
 * Toasts pour erreurs non affichées inline (validation = champs, 403/500 = bannière).
 * Les messages 403/500 restent le texte backend exact via getWhatIfErrorMessage.
 */
export function useWhatIfSimulation() {
    const { push: toast } = useToast();

    return useMutation<WhatIfResponse, Error, WhatIfRequest>({
        mutationFn: runWhatIfSimulation,
        onMutate: (vars) => {
            logWhatIf("5/6 — onMutate React Query (avant mutationFn)", vars);
        },
        onSuccess: (data) => {
            logWhatIf("6/6 — onSuccess React Query (state mis à jour)", {
                status: data.status,
                score_before: data.score_before,
                score_after: data.score_after,
                delta: data.delta,
                decision_changed: data.decision_changed,
                llm_enriched: data.llm_enriched,
            });
        },
        onError: (err) => {
            logWhatIf("onError React Query (isPending → false)", err);
            const code = getWhatIfErrorCode(err);
            // 400 : erreurs sous les champs — pas de toast générique
            if (code === "validation_failed") return;
            // 403 / 500 : bannière UI affiche le message exact ; toast discret pour timeout / baseline
            if (code === "forbidden" || code === "observer_error" || code === "orchestrator_error") return;
            if (code === "baseline_missing") {
                toast("Pas de score initial — lance d'abord une analyse normale du projet.", "error");
                return;
            }
            if (code === "timeout") {
                toast(
                    "La simulation a dépassé le délai d'attente (~2 min). Réessaie ou contacte l'admin si le workflow n8n est lent.",
                    "error",
                );
                return;
            }
            toast(getWhatIfErrorMessage(err), "error");
        },
    });
}
