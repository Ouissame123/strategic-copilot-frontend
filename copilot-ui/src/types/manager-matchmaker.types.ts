import type { DashboardMatchmaker } from "@/types/api.types";

export type ManagerProjectTalentMatchingBody = {
    project_id: string;
    enterprise_id: string;
    manager_id: string;
    top_n: number;
    simulation_mode: boolean;
    use_ai: boolean;
};

export type ManagerProjectTalentMatchingAction = {
    action_type: string;
    action_summary: string;
    priority_level: string;
    skill?: string;
};

export type ManagerProjectTalentMatchingTalent = {
    talent_name: string;
    overall_score: number | null;
    skill_fit_score: number | null;
    missing_skills: string[];
};

/** Réponse normalisée d’un appel POST /webhook/api/project/talents. */
export type ManagerProjectTalentMatchingResult = {
    project_id: string;
    project_name: string;
    adequacy_score: number | null;
    gap_count: number;
    recommended_actions: ManagerProjectTalentMatchingAction[];
    top_talents: ManagerProjectTalentMatchingTalent[];
    critical_gaps: string[];
};

export type ManagerMatchmakerDashboard = DashboardMatchmaker & {
    /** Projets sans réponse exploitable (pour debug interne, optionnel). */
    failed_project_ids?: string[];
};
