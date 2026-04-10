import {
    Activity,
    BarChart01,
    BookOpen01,
    Certificate01,
    FileCheck02,
    Folder,
    LayersTwo02,
    User01,
    Users01,
    UsersCheck,
    UsersUp,
    Zap,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";
import type { WorkspaceRole } from "@/types/workspace-role";

type TNav = (key: string) => string;

export function getNavigationForWorkspaceRole(role: WorkspaceRole, t: TNav): NavItemType[] {
    const dashboard = { label: t("dashboard"), href: "/", icon: LayersTwo02 };
    const projects = { label: t("projects"), href: "/projects", icon: Folder };
    const decisionLog = { label: t("decisionLog"), href: "/decision-log", icon: FileCheck02 };
    const projectShowcase = { label: t("projectShowcase"), href: "/projet", icon: Certificate01 };

    switch (role) {
        case "rh":
            return [
                dashboard,
                { label: t("rhTalent"), href: "/workspace/rh/talent", icon: Users01 },
                { label: t("rhAccounts"), href: "/workspace/rh/accounts", icon: UsersCheck },
                { label: t("users"), href: "/users", icon: User01 },
                { label: "Sessions", href: "/workspace/rh/sessions", icon: Activity },
                { label: t("rhReports"), href: "/workspace/rh/reports", icon: BarChart01 },
                { label: t("rhStaffing"), href: "/workspace/rh/talent/staffing", icon: UsersUp },
                decisionLog,
                projectShowcase,
            ];
        case "manager":
            return [
                { label: t("managerWorkspace"), href: "/workspace/manager/projects", icon: Zap },
                projects,
                { label: t("managerMonitoring"), href: "/workspace/manager/monitoring", icon: Activity },
                decisionLog,
                projectShowcase,
            ];
        case "talent":
        default:
            return [
                { label: t("talentMissions"), href: "/workspace/talent/missions", icon: Zap },
                { label: t("talentTraining"), href: "/workspace/talent/training", icon: BookOpen01 },
                decisionLog,
                { label: t("dashboard"), href: "/", icon: LayersTwo02 },
                { label: t("profile"), href: "/profile", icon: User01 },
                projectShowcase,
            ];
    }
}
