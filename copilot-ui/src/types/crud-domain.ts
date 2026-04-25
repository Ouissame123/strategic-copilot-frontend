/**
 * Modèles domaine — champs analytiques / décision : lecture seule depuis l’API.
 * Le frontend n’effectue aucun recalcul de scores ni de recommandations.
 */

/** Bloc optionnel renvoyé après mutation (affichage uniquement). */
export interface AnalysisRefreshPayload {
    viability_score?: number | null;
    risk_score?: number | null;
    /** Ex. Continue | Adjust | Stop — texte serveur. */
    decision?: string | null;
    [key: string]: unknown;
}

/** Réponse API typique succès (souple selon backend). */
export interface ApiSuccessEnvelope<T> {
    status?: string;
    message?: string;
    data?: T;
    analysis_refresh?: AnalysisRefreshPayload;
    [key: string]: unknown;
}

export interface Project {
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    /** Lecture seule — jamais recalculé côté front. */
    viability_score?: number | null;
    risk_score?: number | null;
    /** Libellé serveur éventuel (ex. Continue / Adjust / Stop). */
    decision?: string | null;
    [key: string]: unknown;
}

export type ProjectCreateDTO = Omit<Project, "id"> & { id?: never };
export type ProjectUpdateDTO = Partial<Omit<Project, "id">>;

export interface Talent {
    id: string;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    status?: string | null;
    [key: string]: unknown;
}

export type TalentCreateDTO = Omit<Talent, "id"> & { id?: never };
export type TalentUpdateDTO = Partial<Omit<Talent, "id">>;

export interface Assignment {
    id: string;
    project_id?: string | null;
    talent_id?: string | null;
    role?: string | null;
    status?: string | null;
    [key: string]: unknown;
}

export type AssignmentCreateDTO = Omit<Assignment, "id"> & { id?: never };
export type AssignmentUpdateDTO = Partial<Omit<Assignment, "id">>;

export interface Skill {
    id: string;
    name: string;
    category?: string | null;
    [key: string]: unknown;
}

export type SkillCreateDTO = Omit<Skill, "id"> & { id?: never };
export type SkillUpdateDTO = Partial<Omit<Skill, "id">>;

export interface TalentSkill {
    id: string;
    talent_id: string;
    skill_id: string;
    level?: string | number | null;
    [key: string]: unknown;
}

export type TalentSkillCreateDTO = Omit<TalentSkill, "id"> & { id?: never };
export type TalentSkillUpdateDTO = Partial<Omit<TalentSkill, "id">>;

/** Résultat normalisé après POST/PATCH/DELETE. */
export interface CrudMutationResult<T> {
    raw: unknown;
    data: T | undefined;
    message: string | undefined;
    analysisRefresh: AnalysisRefreshPayload | undefined;
}
