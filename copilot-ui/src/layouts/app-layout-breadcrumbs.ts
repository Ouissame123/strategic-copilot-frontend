import { matchPath } from "react-router";
import type { AuthUser } from "@/types/auth";
import type { Role } from "@/types/auth";
import { getDefaultWorkspacePath, workspaceProjectsListPath } from "@/utils/workspace-routes";

function inferRoleFromPath(pathname: string): Role | null {
    if (pathname.startsWith("/workspace/rh")) return "rh";
    if (pathname.startsWith("/workspace/manager")) return "manager";
    if (pathname.startsWith("/workspace/talent")) return "talent";
    return null;
}

/** Lien « Accueil » du fil d’Ariane = hub du workspace courant. */
function workspaceHubHref(pathname: string): string {
    const role = inferRoleFromPath(pathname);
    if (role) return getDefaultWorkspacePath(role);
    return "/";
}

export type BreadcrumbSegment = { to?: string; label: string };

type Translate = (key: string, options?: Record<string, string | number>) => string;

export function getDisplayFirstName(user: AuthUser | null | undefined): string {
    if (!user) return "";
    const full = user.fullName?.trim();
    if (full) {
        const first = full.split(/\s+/)[0];
        return first || full;
    }
    const local = user.email?.split("@")[0]?.trim();
    return local ?? "";
}

export type BreadcrumbOptions = {
    /** Dernier segment sur la fiche projet (remplace le libellé générique). */
    projectDetailLabel?: string;
};

/**
 * Segments du fil d’Ariane (hors page d’accueil). Le premier segment pointe toujours vers l’accueil.
 */
export function resolveBreadcrumbs(pathname: string, t: Translate, options?: BreadcrumbOptions): BreadcrumbSegment[] {
    const hub = (): BreadcrumbSegment => ({ to: workspaceHubHref(pathname), label: t("common:layout.breadcrumbHome") });

    if (pathname === "/" || pathname === "") {
        return [hub(), { label: t("common:layout.breadcrumbDashboard") }];
    }

    const talentProjectDetailMatch = matchPath({ path: "/workspace/talent/projects/:projectId", end: true }, pathname);
    if (talentProjectDetailMatch) {
        const label =
            options?.projectDetailLabel?.trim() ||
            t("common:layout.breadcrumbProject");
        return [
            hub(),
            { to: "/workspace/talent/projects", label: t("nav:talentNavProjects") },
            { label },
        ];
    }

    const managerProjectDetailMatch = matchPath({ path: "/workspace/manager/projects/:projectId", end: true }, pathname);
    if (managerProjectDetailMatch) {
        const label =
            options?.projectDetailLabel?.trim() ||
            t("common:layout.breadcrumbProject");
        return [
            hub(),
            { to: "/workspace/manager/projects", label: t("nav:managerNavProjects") },
            { label },
        ];
    }

    const projectMatchWorkspace = matchPath({ path: "/workspace/:role/projects/:projectId", end: true }, pathname);
    const projectMatchLegacy =
        matchPath({ path: "/projects/:projectId", end: true }, pathname) ||
        matchPath({ path: "/project/:projectId", end: true }, pathname);
    if (projectMatchWorkspace || projectMatchLegacy) {
        const label =
            options?.projectDetailLabel?.trim() ||
            t("common:layout.breadcrumbProject");
        const role = inferRoleFromPath(pathname);
        const listHref = role ? workspaceProjectsListPath(role) : "/projects";
        return [hub(), { to: listHref, label: t("nav:projects") }, { label }];
    }

    if (matchPath({ path: "/workspace/rh/dashboard", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavDashboard") }];
    }
    if (matchPath({ path: "/workspace/rh/employees", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavEmployees") }];
    }
    if (matchPath({ path: "/workspace/rh/skills-catalog", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavSkills") }];
    }
    if (matchPath({ path: "/workspace/rh/critical-gaps", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavGaps") }];
    }
    if (matchPath({ path: "/workspace/rh/training-plans", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavTraining") }];
    }
    if (matchPath({ path: "/workspace/rh/manager-requests", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavManagerRequests") }];
    }
    if (matchPath({ path: "/workspace/rh/mobility", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavMobility") }];
    }
    if (matchPath({ path: "/workspace/rh/org-alerts", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavAlerts") }];
    }
    if (matchPath({ path: "/workspace/rh/projects", end: true }, pathname)) {
        return [hub(), { label: t("nav:projects") }];
    }
    if (matchPath({ path: "/workspace/rh/profile", end: true }, pathname)) {
        return [hub(), { label: t("nav:profile") }];
    }
    if (matchPath({ path: "/workspace/rh/decision-log", end: true }, pathname)) {
        return [hub(), { label: t("nav:decisionLog") }];
    }

    if (matchPath({ path: "/workspace/rh/talent/staffing", end: true }, pathname)) {
        return [
            hub(),
            { to: "/workspace/rh/talent", label: t("nav:rhTalent") },
            { label: t("common:workspace.tabStaffing") },
        ];
    }
    if (matchPath({ path: "/workspace/rh/talent/gaps", end: true }, pathname)) {
        return [
            hub(),
            { to: "/workspace/rh/talent", label: t("nav:rhTalent") },
            { label: t("common:workspace.tabGaps") },
        ];
    }
    if (matchPath({ path: "/workspace/rh/talent/profiles", end: true }, pathname)) {
        return [
            hub(),
            { to: "/workspace/rh/talent", label: t("nav:rhTalent") },
            { label: t("common:workspace.tabProfiles") },
        ];
    }
    if (matchPath({ path: "/workspace/rh/talent", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhTalent") }];
    }
    if (matchPath({ path: "/workspace/rh/actions", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavManagerRequests") }];
    }

    if (matchPath({ path: "/workspace/rh/accounts", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhNavAccounts") }];
    }
    if (matchPath({ path: "/workspace/rh/sessions", end: true }, pathname)) {
        return [hub(), { label: t("nav:sessions") }];
    }
    if (matchPath({ path: "/workspace/rh/reports", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhReports") }];
    }

    if (matchPath({ path: "/workspace/manager/dashboard", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavDashboard") }];
    }
    if (matchPath({ path: "/workspace/manager/projects", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavProjects") }];
    }
    if (matchPath({ path: "/workspace/manager/project", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavProjectDetail") }];
    }
    if (matchPath({ path: "/workspace/manager/team", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavTeam") }];
    }
    if (matchPath({ path: "/workspace/manager/risks", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavRisks") }];
    }
    if (matchPath({ path: "/workspace/manager/rh-requests", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavRhRequests") }];
    }
    if (matchPath({ path: "/workspace/manager/reports", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavReports") }];
    }
    if (matchPath({ path: "/workspace/manager/portfolio", end: true }, pathname)) {
        return [hub(), { to: "/workspace/manager/projects", label: t("nav:managerNavProjects") }];
    }
    if (matchPath({ path: "/workspace/manager/monitoring", end: true }, pathname)) {
        return [hub(), { label: t("nav:managerNavTeam") }];
    }
    if (matchPath({ path: "/workspace/manager/profile", end: true }, pathname)) {
        return [hub(), { label: t("nav:profile") }];
    }
    if (matchPath({ path: "/workspace/manager/decision-log", end: true }, pathname)) {
        return [hub(), { label: t("nav:decisionLog") }];
    }

    if (matchPath({ path: "/workspace/talent", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavDashboard") }];
    }
    if (matchPath({ path: "/workspace/talent/dashboard", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavDashboard") }];
    }
    if (matchPath({ path: "/workspace/talent/projects", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavProjects") }];
    }
    if (matchPath({ path: "/workspace/talent/tasks", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavTasks") }];
    }
    if (matchPath({ path: "/workspace/talent/workload", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavWorkload") }];
    }
    if (matchPath({ path: "/workspace/talent/skills", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavSkills") }];
    }
    if (matchPath({ path: "/workspace/talent/training", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavTraining") }];
    }
    if (matchPath({ path: "/workspace/talent/trainings", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavTraining") }];
    }
    if (matchPath({ path: "/workspace/talent/notifications", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavNotifications") }];
    }
    if (matchPath({ path: "/workspace/talent/profile", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavProfile") }];
    }
    if (matchPath({ path: "/workspace/talent/decision-log", end: true }, pathname)) {
        return [hub(), { label: t("nav:talentNavDashboard") }];
    }

    if (matchPath({ path: "/users", end: true }, pathname)) {
        return [hub(), { label: t("nav:rhAccounts") }];
    }
    if (matchPath({ path: "/projects", end: true }, pathname)) {
        return [hub(), { label: t("nav:projects") }];
    }
    if (matchPath({ path: "/decision-log", end: true }, pathname)) {
        return [hub(), { label: t("nav:decisionLog") }];
    }
    if (matchPath({ path: "/profile", end: true }, pathname)) {
        return [hub(), { label: t("nav:profile") }];
    }

    return [hub(), { label: t("common:layout.breadcrumbFallback") }];
}
