/** Contrat API absences talent RH */

export type RhAbsenceType = "sick" | "vacation" | "training" | "other" | "unpaid";

export type RhAbsenceStatus = "current" | "upcoming" | "past";

export type RhTalentAbsence = {
    id: string;
    absence_type: RhAbsenceType | string;
    start_date: string;
    end_date: string | null;
    duration_days: number | null;
    status: RhAbsenceStatus | string;
};

export type RhTalentAbsencesSummary = {
    total: number;
    current: number;
    upcoming: number;
    past: number;
};

export type RhTalentAbsencesResponse = {
    absences: RhTalentAbsence[];
    summary: RhTalentAbsencesSummary;
};

export type CreateRhTalentAbsencePayload = {
    start_date: string;
    end_date: string | null;
    absence_type: RhAbsenceType;
};
