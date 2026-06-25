import type { ProjectStatus } from "@/types/api.types";

/** State passé via `navigate(..., { state })` depuis la liste projets manager. */
export type ManagerProjectNavState = {
    projectName?: string;
    projectStatus?: ProjectStatus | string;
    projectPriority?: number;
};

export function readManagerProjectNavState(state: unknown): ManagerProjectNavState | null {
    if (!state || typeof state !== "object") return null;
    const o = state as ManagerProjectNavState;
    if (!o.projectName?.trim()) return null;
    return o;
}
