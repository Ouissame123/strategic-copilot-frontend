import type { TFunction } from "i18next";
import {
    AlertTriangle,
    BarChart01,
    Clock,
    Folder,
    LayersTwo02,
    User01,
    Users01,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Navigation latérale manager uniquement — `/workspace/manager/*`. */
export function getManagerWorkspaceNavItems(t: TFunction<"nav", undefined>): NavItemType[] {
    return [
        { label: t("managerNavDashboard"), href: "/workspace/manager/dashboard", icon: LayersTwo02 },
        { label: t("managerNavProjects"), href: "/workspace/manager/projects", icon: Folder },
        { label: t("managerNavTeam"), href: "/workspace/manager/team", icon: Users01 },
        { label: t("managerNavRisks"), href: "/workspace/manager/risks", icon: AlertTriangle },
        { label: t("decisionLog"), href: "/workspace/manager/decision-log", icon: Clock },
        { label: t("managerNavReports"), href: "/workspace/manager/reports", icon: BarChart01 },
        { label: t("profile"), href: "/workspace/manager/profile", icon: User01 },
    ];
}
