import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, MessageSquare, Users } from "lucide-react";
import { BarChart01, FileCheck02, Share04, User01, Users01 } from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Navigation latérale RH uniquement — URLs sous `/workspace/rh/*`. */
export function useRhWorkspaceNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");

    return useMemo(
        () => [
            { label: t("rhNavDashboard"), href: "/workspace/rh/dashboard", icon: BarChart01 },
            { label: t("rhNavEmployees"), href: "/workspace/rh/employees", icon: Users01 },
            {
                label: t("rhNavManagerRequests"),
                href: "/workspace/rh/manager-requests",
                icon: FileCheck02,
            },
            {
                label: t("rhNavAccounts"),
                href: "/workspace/rh/accounts",
                icon: Users,
            },
            {
                label: t("rhNavWorkforceArbitration"),
                href: "/workspace/rh/workforce-arbitration",
                icon: GitBranch,
            },
            { label: t("rhNavMobility"), href: "/workspace/rh/mobility", icon: Share04 },
            { label: "Assistant RH IA", href: "/workspace/rh/chat", icon: MessageSquare },
            { label: t("profile"), href: "/workspace/rh/profile", icon: User01 },
        ],
        [t],
    );
}
