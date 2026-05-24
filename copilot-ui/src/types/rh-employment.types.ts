/**
 * Employment talent RH — GET/PUT `/rh/talents/:id/employment`.
 */

export type EmploymentData = {
    role?: string | null;
    salary?: string | number | null;
    contract_type?: string | null;
    integration_date?: string | null;
    contract_end_date?: string | null;
    tenure_years?: number | null;
    tenure_months?: number | null;
};

export type EmploymentManager = {
    manager_id?: string | null;
    manager_name?: string | null;
    manager_email?: string | null;
};

export type EmploymentResponse = {
    success?: boolean;
    employment: EmploymentData | null;
    manager: EmploymentManager | null;
    message?: string;
    /** GET : aucun webhook employment actif (404 sur toutes les bases). */
    notConfigured?: boolean;
};

/** Corps PUT WF_RH_Employment — talent_id dans l’URL uniquement. */
export type UpdateEmploymentPayload = {
    role: string;
    salary: number;
    contract_type: string;
    integration_date: string;
    /** Stocké sur `public.talents.contract_end_date` (pas `talent_employment`). */
    contract_end_date?: string;
};

export const RH_EMPLOYMENT_CONTRACT_TYPES = [
    "CDI",
    "CDD",
    "FREELANCE",
    "STAGE",
    "INTERNSHIP",
    "PART_TIME",
] as const;

export type RhEmploymentContractType = (typeof RH_EMPLOYMENT_CONTRACT_TYPES)[number];

/** @deprecated Utiliser `EmploymentData` + `EmploymentManager`. */
export type RhTalentEmploymentRecord = EmploymentData & {
    manager_name?: string | null;
    manager_id?: string | null;
};

/** @deprecated Utiliser `EmploymentResponse`. */
export type RhTalentEmploymentResponse = EmploymentResponse;

/** @deprecated Utiliser `UpdateEmploymentPayload`. */
export type UpsertRhTalentEmploymentPayload = UpdateEmploymentPayload;
