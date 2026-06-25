export type SkillLevelLabel = "Découverte" | "Débutant" | "Intermédiaire" | "Expert";
export type GapSeverity = "high" | "medium" | "low";
export type SkillsTab = "mine" | "gaps" | "catalog";

export interface MySkill {
    skill_id: string;
    skill_name: string;
    category: string | null;
    skill_type: string | null;
    level: number;
    level_label: SkillLevelLabel;
    years_experience: number | null;
    last_used_at: string | null;
    is_certified: boolean;
    created_at: string;
    updated_at: string;
}

export interface CatalogSkill {
    skill_id: string;
    skill_name: string;
    category: string | null;
    skill_type: string | null;
    already_added: boolean;
}

export interface SkillGap {
    skill_id: string;
    skill_name: string;
    category: string | null;
    max_level_required: number;
    my_level: number;
    gap_size: number;
    projects_count: number;
    has_mandatory: boolean;
    severity: GapSeverity;
}

export interface SkillsSummary {
    total: number;
    certified: number;
    avg_level: number;
    by_level: { expert: number; intermediate: number; beginner: number };
    recently_used: number;
    by_category: Array<{ category: string; count: number; avg_level: number }>;
}

export interface CreateSkillPayload {
    skill_id: string;
    level: number;
    years_experience?: number;
    is_certified?: boolean;
    last_used_at?: string;
}

export interface UpdateSkillPayload {
    level?: number;
    years_experience?: number;
    is_certified?: boolean;
    last_used_at?: string;
}

export interface TalentSkillsListFilters {
    category?: string;
    certified?: boolean;
    limit?: number;
}
