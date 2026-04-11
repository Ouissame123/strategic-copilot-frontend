/** Product workspace persona (UX layer). Distinct from legacy demo auth in local storage. */
export type WorkspaceRole = "rh" | "manager" | "talent";

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ["rh", "manager", "talent"] as const;
