/**
 * Couche services RH talents — réexporte l’API webhook n8n (PATCH/GET/POST/DELETE).
 */
export {
    updateRhTalent,
    mapRhTalentUpdateError,
    mergeRhTalentListItem,
    RhTalentUpdateError,
    RH_TALENT_UPDATE_WEBHOOK_PREFIX_DEFAULT,
    RH_TALENT_UPDATE_WORKFLOW_SLUG,
} from "@/api/rh-talents.api";

export type { UpdateRhTalentPayload, UpdateRhTalentResponse } from "@/types/rh-talents.types";
