export interface TalentProfileManager {
    name: string;
    email: string;
}

export interface TalentProfileAccount {
    user_id: string;
    email: string;
    must_change_password: boolean;
}

export interface TalentProfileEditable {
    bio: string;
    pro_phone: string;
    address: string;
    city: string;
    country: string;
    personal_phone: string;
}

export interface TalentProfile {
    talent_id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    job_title: string | null;
    department: string | null;
    seniority_level: string | null;
    hire_date: string | null;
    contract_end_date: string | null;
    status: string;
    manager: TalentProfileManager | null;
    account: TalentProfileAccount;
    editable: TalentProfileEditable;
}

export interface ProfileResponse {
    status: "success";
    profile: TalentProfile;
    editable_fields: string[];
    readonly_fields: string[];
}

export type TalentProfileEditableField = keyof TalentProfileEditable;

export interface TalentProfileUpdatePayload {
    bio?: string;
    pro_phone?: string;
    address?: string;
    city?: string;
    country?: string;
    personal_phone?: string;
}

export interface TalentChangePasswordPayload {
    old_password: string;
    new_password: string;
}

export interface TalentChangePasswordResponse {
    must_relogin?: boolean;
}
