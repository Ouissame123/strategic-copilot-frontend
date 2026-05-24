/** WF_RH Availability — GET /rh/availability/overview & GET /rh/talents/:id/availability */

export type RhAvailabilityStatus =
    | "available"
    | "partially_available"
    | "nearly_full"
    | "fully_loaded"
    | string;

export type RhAvailabilityProjectRef = {
    project_id?: string | null;
    project_name?: string | null;
    allocation_pct?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string | null;
};

export type RhAvailabilityAssignment = {
    id?: string | null;
    project_id?: string | null;
    project_name?: string | null;
    role_on_project?: string | null;
    allocation_pct?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string | null;
};

export type RhAvailabilityRelease = {
    project_id?: string | null;
    project_name?: string | null;
    release_date?: string | null;
    freed_allocation_pct?: number | null;
};

/** Résumé par talent — vue overview (liste). */
export type RhTalentAvailabilitySummary = {
    talent_id: string;
    availability_status?: RhAvailabilityStatus | null;
    active_load_pct: number;
    planned_load_pct: number;
    available_pct: number;
    active_projects_count: number;
};

export type RhAvailabilityOverviewResponse = {
    status?: string;
    talents: RhTalentAvailabilitySummary[];
    count: number;
};

/** Détail disponibilité — drawer talent. */
export type RhTalentAvailabilityDetail = {
    talent_id: string;
    availability_status?: RhAvailabilityStatus | null;
    active_load_pct: number;
    planned_load_pct: number;
    total_committed_pct: number;
    available_pct: number;
    available_after_planned_pct: number;
    active_projects: RhAvailabilityProjectRef[];
    planned_projects: RhAvailabilityProjectRef[];
    current_assignments: RhAvailabilityAssignment[];
    upcoming_releases: RhAvailabilityRelease[];
    recommended_action?: string | null;
};
