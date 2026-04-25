import { Navigate, useParams } from "react-router";
import { useAuth } from "@/providers/auth-provider";
import {
    getDefaultWorkspacePath,
    workspaceDecisionLogPath,
    workspaceProfilePath,
    workspaceProjectDetailPath,
    workspaceProjectsListPath,
} from "@/utils/workspace-routes";

/** Redirige `/` vers le hub workspace du rôle JWT. */
export function RootWorkspaceRedirect() {
    const { user } = useAuth();
    return <Navigate to={getDefaultWorkspacePath(user?.role)} replace />;
}

/** Anciens liens `/projects` → `/workspace/{role}/projects`. */
export function LegacyProjectsListRedirect() {
    const { user } = useAuth();
    return <Navigate to={workspaceProjectsListPath(user?.role)} replace />;
}

/** Anciens liens `/projects/:id` et `/project/:id`. */
export function LegacyProjectDetailRedirect() {
    const { user } = useAuth();
    const { projectId } = useParams();
    if (!projectId) return <Navigate to={workspaceProjectsListPath(user?.role)} replace />;
    return <Navigate to={workspaceProjectDetailPath(user?.role, projectId)} replace />;
}

export function LegacyDecisionLogRedirect() {
    const { user } = useAuth();
    return <Navigate to={workspaceDecisionLogPath(user?.role)} replace />;
}

export function LegacyProfileRedirect() {
    const { user } = useAuth();
    return <Navigate to={workspaceProfilePath(user?.role)} replace />;
}
