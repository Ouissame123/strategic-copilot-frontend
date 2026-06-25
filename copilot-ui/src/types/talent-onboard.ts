export type SeniorityLevel =
    | "Stagiaire"
    | "Junior"
    | "Mid"
    | "Senior"
    | "Lead"
    | "Expert"
    | "Freelance";

export interface OnboardTalentPayload {
    name: string;
    email: string;
    password: string;
    job_title: string;
    department?: string;
    seniority_level?: string;
    manager_user_id?: string;
    phone?: string;
}

export interface OnboardTalentResponse {
    status: "success";
    operation: "onboard_talent" | "grant_access";
    user: {
        id: string;
        full_name: string;
        email: string;
        role: "talent";
        status: "active";
        created_at: string;
    };
    talent: {
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        department: string | null;
        seniority_level: SeniorityLevel | string | null;
        manager_user_id: string | null;
        user_id: string;
        enterprise_id: string;
    };
    message: string;
    login_info: {
        email: string;
        portal_url: string;
        note: string;
    };
}
