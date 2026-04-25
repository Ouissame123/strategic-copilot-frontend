import { useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
    getDefaultWorkspacePath,
    workspaceDecisionLogPath,
    workspaceProfilePath,
    workspaceProjectDetailPath,
    workspaceProjectsListPath,
} from "@/utils/workspace-routes";

export type WorkspacePaths = {
    home: string;
    projects: string;
    project: (projectId: string) => string;
    decisionLog: string;
    profile: string;
};

/** Chemins du workspace courant (JWT) pour liens et redirections sans logique métier. */
export function useWorkspacePaths(): WorkspacePaths {
    const { user } = useAuth();
    const role = user?.role ?? null;

    return useMemo(
        () => ({
            home: getDefaultWorkspacePath(role),
            projects: workspaceProjectsListPath(role),
            project: (projectId: string) => workspaceProjectDetailPath(role, projectId),
            decisionLog: workspaceDecisionLogPath(role),
            profile: workspaceProfilePath(role),
        }),
        [role],
    );
}
