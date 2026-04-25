import type { TFunction } from "i18next";
import {
    Activity,
    AlertCircle,
    BarChart01,
    FileCheck02,
    Folder,
    LayersTwo02,
    User01,
    ZapFast,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Navigation latérale talent uniquement — `/workspace/talent/*`. */
export function getTalentWorkspaceNavItems(t: TFunction<"nav", undefined>): NavItemType[] {
    return [
        { label: t("talentNavDashboard"), href: "/workspace/talent", icon: LayersTwo02 },
        { label: t("talentNavProjects"), href: "/workspace/talent/projects", icon: Folder },
        { label: t("talentNavTasks"), href: "/workspace/talent/tasks", icon: FileCheck02 },
        { label: t("talentNavWorkload"), href: "/workspace/talent/workload", icon: Activity },
        { label: t("talentNavSkills"), href: "/workspace/talent/skills", icon: ZapFast },
        { label: t("talentNavTraining"), href: "/workspace/talent/trainings", icon: BarChart01 },
        { label: t("talentNavNotifications"), href: "/workspace/talent/notifications", icon: AlertCircle },
        { label: t("talentNavProfile"), href: "/workspace/talent/profile", icon: User01 },
    ];
}
