export type Role = "rh" | "manager" | "talent";
export type UserStatus = "pending" | "active" | "disabled";
export type SessionStatus = "active" | "expired" | "revoked";

export type Permission =
    | "view_global_dashboard"
    | "view_all_users"
    | "assign_roles"
    | "change_user_role"
    | "disable_user"
    | "view_all_sessions"
    | "revoke_session"
    | "view_system_activity"
    | "view_manager_dashboard"
    | "view_scope_data"
    | "manage_scope_actions"
    | "view_own_dashboard"
    | "view_own_profile"
    | "update_own_profile"
    | "view_own_assignments";

export interface AuthUser {
    id: string;
    fullName: string;
    /** Si le backend les expose (sinon dérivés du nom complet à l’affichage). */
    firstName?: string;
    lastName?: string;
    email: string;
    /** Périmètre entreprise (ex. GET /me : `enterprise_id`) — requis pour certains appels manager. */
    enterpriseId?: string;
    role: Role | null;
    status: UserStatus;
    /** Si true, le front peut afficher une bannière ou rediriger vers changement de mot de passe. */
    mustChangePassword?: boolean;
    passwordExpiresAt?: string | null;
}

export interface LoginResponse {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: AuthUser;
}
