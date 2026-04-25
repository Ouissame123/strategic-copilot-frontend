import type { Role } from "@/types/auth";

export const WORKSPACE_PREFIX: Record<Role, string> = {
    rh: "/workspace/rh",
    manager: "/workspace/manager",
    talent: "/workspace/talent",
};

export function assertRole(role: Role | null | undefined): Role {
    return role ?? "talent";
}

/** Point d’entrée par défaut après connexion ou accès direct au workspace. */
export function getDefaultWorkspacePath(role: Role | null | undefined): string {
    const r = assertRole(role);
    if (r === "rh") return `${WORKSPACE_PREFIX.rh}/dashboard`;
    if (r === "manager") return `${WORKSPACE_PREFIX.manager}/dashboard`;
    return `${WORKSPACE_PREFIX.talent}/dashboard`;
}

export function workspaceProjectsListPath(role: Role | null | undefined): string {
    return `${WORKSPACE_PREFIX[assertRole(role)]}/projects`;
}

export function workspaceProjectDetailPath(role: Role | null | undefined, projectId: string): string {
    return `${workspaceProjectsListPath(role)}/${encodeURIComponent(projectId)}`;
}

export function workspaceDecisionLogPath(role: Role | null | undefined): string {
    return `${WORKSPACE_PREFIX[assertRole(role)]}/decision-log`;
}

export function workspaceProfilePath(role: Role | null | undefined): string {
    return `${WORKSPACE_PREFIX[assertRole(role)]}/profile`;
}

/**
 * Indique si une URL peut être utilisée comme cible après login (évite de renvoyer un RH vers une page manager).
 */
export function isPathAllowedForRole(pathname: string, role: Role | null | undefined): boolean {
    if (!pathname.startsWith("/")) return false;
    const r = assertRole(role);
    const base = WORKSPACE_PREFIX[r];
    if (pathname === base || pathname.startsWith(`${base}/`)) return true;
    return false;
}
