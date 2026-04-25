import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet } from "@/utils/apiClient";

export type TalentWorkspacePageKey =
    | "dashboard"
    | "projects"
    | "tasks"
    | "workload"
    | "skills"
    | "trainings"
    | "notifications"
    | "profile";

const TALENT_WORKSPACE_ENDPOINTS: Record<TalentWorkspacePageKey, string> = {
    dashboard: "/api/workspace/talent/dashboard",
    projects: "/api/workspace/talent/projects",
    tasks: "/api/workspace/talent/tasks",
    workload: "/api/workspace/talent/workload",
    skills: "/api/workspace/talent/skills",
    trainings: "/api/workspace/talent/trainings",
    notifications: "/api/workspace/talent/notifications",
    profile: "/api/workspace/talent/profile",
};

export async function fetchTalentWorkspacePage(
    page: TalentWorkspacePageKey,
    options?: ApiClientOptions,
): Promise<unknown> {
    return apiGet<unknown>(TALENT_WORKSPACE_ENDPOINTS[page], options);
}

