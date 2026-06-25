import { API_ROUTES } from "@/lib/api-routes";

export function getWmpAssignProjectsPrefix(): string {
    const sample = API_ROUTES.projectAssign("__pid__");
    return sample.replace(/\/__pid__\/assignments$/, "");
}

export function getWmpUnassignProjectsPrefix(): string {
    const sample = API_ROUTES.projectUnassign("__pid__", "__tid__");
    return sample.replace(/\/__pid__\/assignments\/__tid__$/, "");
}

export function getWmpAssignPostUrl(projectId: string): string {
    return API_ROUTES.projectAssign(projectId);
}

export function getWmpUnassignDeleteUrl(projectId: string, talentId: string): string {
    return API_ROUTES.projectUnassign(projectId, talentId);
}
