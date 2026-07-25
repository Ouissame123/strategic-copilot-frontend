import { MANAGER_RH_CANCEL_PATCH_BODY } from "@/api/rh-actions.constants";
import type { RhStatusView } from "@/components/manager/rh-requests/rh-status-views";
import type { PatchRhActionBody } from "@/types/manager-rh-actions.types";

/**
 * Colonnes Kanban → body PATCH accepté par `patchRhAction` / `PatchRhActionBody`.
 * `pending` et `in_progress` n'ont pas de statut d'écriture dans le contrat manager.
 */
export function patchBodyForKanbanColumn(view: RhStatusView): PatchRhActionBody | null {
    switch (view) {
        case "accepted":
            return { status: "accepted", response_message: "Statut mis à jour par le manager" };
        case "done":
            return { status: "done", response_message: "Demande marquée comme terminée" };
        case "refused_cancelled":
            return { ...MANAGER_RH_CANCEL_PATCH_BODY };
        case "pending":
        case "in_progress":
        case "all":
        default:
            return null;
    }
}

export function kanbanMoveTargets(currentView: RhStatusView): Array<Exclude<RhStatusView, "all">> {
    const candidates: Array<Exclude<RhStatusView, "all">> = ["accepted", "done", "refused_cancelled"];
    return candidates.filter((v) => v !== currentView && patchBodyForKanbanColumn(v) != null);
}
