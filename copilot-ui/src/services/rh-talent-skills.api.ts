export {
    getSkillsCatalog,
    mapCatalogSkillsToOptions,
    RH_SKILLS_CATALOG_EMPTY_LABEL,
    resolveRhSkillsCatalogUrl,
    type RhSkillsCatalogOption,
} from "@/api/rh-skills.api";
export {
    addTalentSkill,
    deleteTalentSkill,
    getTalentSkills,
    mapRhTalentSkillApiError,
    RhTalentSkillApiError,
    updateTalentSkill,
} from "@/api/rh-talent-skills.api";

export type {
    AddRhTalentSkillPayload,
    RhSkillsCatalogItem,
    RhTalentSkill,
    RhTalentSkillsResponse,
    RhTalentSkillsSummary,
    UpdateRhTalentSkillPayload,
} from "@/types/rh-talent-skills.types";
