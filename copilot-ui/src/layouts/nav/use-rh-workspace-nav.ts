import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch } from "lucide-react";
import {
    AlertCircle,
    AlertTriangle,
    BarChart01,
    Calendar,
    FileCheck02,
    LayersTwo02,
    Share04,
    User01,
    Users01,
    UsersCheck,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Navigation latérale RH uniquement — URLs sous `/workspace/rh/*`. */
export function useRhWorkspaceNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");

    return useMemo(
        () => [
            { label: t("rhNavDashboard"), href: "/workspace/rh/dashboard", icon: BarChart01 },
            { label: t("rhNavEmployees"), href: "/workspace/rh/employees", icon: Users01 },
            { label: t("rhNavAccounts"), href: "/workspace/rh/accounts", icon: UsersCheck },
            { label: t("rhNavSkills"), href: "/workspace/rh/skills-catalog", icon: LayersTwo02 },
            { label: t("rhNavGaps"), href: "/workspace/rh/critical-gaps", icon: AlertTriangle },
            { label: t("rhNavTraining"), href: "/workspace/rh/training-plans", icon: Calendar },
            {
                label: t("rhNavManagerRequests"),
                href: "/workspace/rh/manager-requests",
                icon: FileCheck02,
            },
            {
                label: t("rhNavWorkforceArbitration"),
                href: "/workspace/rh/workforce-arbitration",
                icon: GitBranch,
            },
            { label: t("rhNavMobility"), href: "/workspace/rh/mobility", icon: Share04 },
            { label: t("rhNavAlerts"), href: "/workspace/rh/org-alerts", icon: AlertCircle },
            { label: t("profile"), href: "/workspace/rh/profile", icon: User01 },
        ],
        [t],
    );
}
