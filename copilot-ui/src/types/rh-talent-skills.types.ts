/** Contrat WF_RH — skills talent & catalogue RH */

export type RhTalentSkill = {
    id: string;
    skill_id?: string | null;
    skill_name: string;
    skill_category?: string | null;
    proficiency_level: number;
    years_experience?: number | null;
    is_gap?: boolean;
};

export type RhTalentSkillsResponse = {
    skills: RhTalentSkill[];
    summary?: RhTalentSkillsSummary;
};

export type RhTalentSkillsSummary = {
    total: number;
    avg_level: number;
    top_category?: string | null;
    gaps_count: number;
};

export type RhSkillsCatalogItem = {
    id: string;
    name: string;
    category?: string | null;
};

export type AddRhTalentSkillPayload = {
    skill_id?: string | null;
    skill_name?: string | null;
    skill_category?: string | null;
    proficiency_level: number;
    years_experience?: number | null;
};

export type UpdateRhTalentSkillPayload = Partial<AddRhTalentSkillPayload>;
