import { getManagerProjectsPatchUrl } from "@/config/manager-projects-api.config";
import { buildBrowserFetchN8nUrl } from "@/lib/build-n8n-url";
import type { MissionControlProject, ProjectStatus } from "@/types/api.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export interface ProjectEditForm {
    name: string;
    description: string;
    status: string;
    priority: number;
    milestone_at: string;
    start_date: string;
    budget_rh_planned: number;
    budget_rh_actual: number;
}

export type ProjectPatchBody = Partial<{
    name: string;
    description: string;
    status: ProjectStatus;
    priority: number;
    milestone_at: string | null;
    start_date: string | null;
    budget_rh_planned: number;
    budget_rh_actual: number;
}>;

export type PatchProjectResponse = {
    status: string;
    operation?: string;
    project_id?: string;
    project: MissionControlProject;
    message?: string;
};

function mapApiProject(raw: Record<string, unknown>): MissionControlProject {
    const capacityRaw = raw.capacity_load_pct;
    const capacityNum = capacityRaw != null ? Number(capacityRaw) : NaN;
    return {
        id: String(raw.id ?? ""),
        name: String(raw.name ?? ""),
        status: String(raw.status ?? "active") as ProjectStatus,
        priority: raw.priority != null ? Number(raw.priority) : null,
        milestone_at: raw.milestone_at != null ? String(raw.milestone_at) : null,
        start_date: raw.start_date != null ? String(raw.start_date) : null,
        budget_rh_planned: raw.budget_rh_planned != null ? Number(raw.budget_rh_planned) : null,
        budget_rh_actual: raw.budget_rh_actual != null ? Number(raw.budget_rh_actual) : null,
        description: raw.description != null ? String(raw.description) : null,
        created_at: String(raw.created_at ?? ""),
        updated_at: String(raw.updated_at ?? ""),
        capacity_load_pct: Number.isFinite(capacityNum) ? capacityNum : null,
    };
}

function resolvePatchUrl(projectId: string): string {
    return buildBrowserFetchN8nUrl(getManagerProjectsPatchUrl(projectId));
}

/** PATCH projet manager — fetch natif, corps partiel uniquement. */
export async function patchProject(
    projectId: string,
    changedFields: ProjectPatchBody,
    token: string,
): Promise<PatchProjectResponse> {
    const res = await fetch(resolvePatchUrl(projectId), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changedFields),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = json as { message?: string };
        throw new Error(err.message || `HTTP ${res.status}`);
    }

    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    const projectRaw = root.project;
    if (!projectRaw || typeof projectRaw !== "object" || Array.isArray(projectRaw)) {
        throw new Error("Réponse invalide : projet absent");
    }

    return {
        status: String(root.status ?? "success"),
        operation: root.operation != null ? String(root.operation) : undefined,
        project_id: root.project_id != null ? String(root.project_id) : undefined,
        message: root.message != null ? String(root.message) : undefined,
        project: mapApiProject(projectRaw as Record<string, unknown>),
    };
}

export function buildProjectPatchBody(
    formValues: ProjectEditForm,
    initialValues: ProjectEditForm,
): ProjectPatchBody {
    const changed: ProjectPatchBody = {};

    const numericKeys: (keyof ProjectEditForm)[] = ["priority", "budget_rh_planned", "budget_rh_actual"];

    for (const key of Object.keys(formValues) as (keyof ProjectEditForm)[]) {
        if (key === "milestone_at" || key === "start_date") continue;
        const next = formValues[key];
        const prev = initialValues[key];
        const isChanged = numericKeys.includes(key)
            ? Number(next) !== Number(prev)
            : String(next ?? "") !== String(prev ?? "");
        if (isChanged) {
            (changed as Record<string, unknown>)[key] = next;
        }
    }

    if (formValues.milestone_at !== initialValues.milestone_at) {
        changed.milestone_at = formValues.milestone_at.trim()
            ? `${formValues.milestone_at.trim()}T00:00:00.000Z`
            : null;
    }
    if (formValues.start_date !== initialValues.start_date) {
        changed.start_date = formValues.start_date.trim() || null;
    }

    return changed;
}
