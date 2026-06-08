export type RhProfileRole = "rh" | "manager" | string;

export type RhProfile = {
    id: string;
    full_name: string;
    email: string;
    role: RhProfileRole;
    status: string;
    avatar_url: string | null;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
};

export type RhProfileGetResponse = {
    profile: RhProfile;
};

export type RhProfilePatchBody = {
    full_name?: string;
    avatar_url?: string;
};

export type RhProfilePatchResponse = {
    status?: string;
    profile?: RhProfile;
    message?: string;
};
