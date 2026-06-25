import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Wallet } from "lucide-react";
import { BarChart01, FileCheck02, User01, Users01 } from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { useRhRequestsSummaryQuery } from "@/hooks/use-rh-requests-decision";
import { useRisksSummary } from "@/hooks/useRhRisks";

/** Navigation latérale RH uniquement — URLs sous `/workspace/rh/*`. */
export function useRhWorkspaceNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");
    const risksSummary = useRisksSummary();
    const requestsSummary = useRhRequestsSummaryQuery();
    const criticalCount = risksSummary.data?.summary?.critical_count ?? 0;
    const urgentRequests = requestsSummary.data?.urgent ?? 0;

    return useMemo(
        () => [
            { label: t("rhNavDashboard"), href: "/workspace/rh/dashboard", icon: BarChart01 },
            { label: t("rhNavEmployees"), href: "/workspace/rh/employees", icon: Users01 },
            {
                label: "Demandes & Actions RH",
                href: "/workspace/rh/actions",
                icon: FileCheck02,
                badge: urgentRequests > 0 ? urgentRequests : undefined,
            },
            {
                label: t("rhNavProjectsBudget"),
                href: "/workspace/rh/projects-budget",
                icon: Wallet,
            },
            {
                label: t("rhNavRisks", "Risques RH"),
                href: "/workspace/rh/risks",
                icon: AlertTriangle,
                badge: criticalCount > 0 ? criticalCount : undefined,
            },
            { label: t("profile"), href: "/workspace/rh/profile", icon: User01 },
        ],
        [t, criticalCount, urgentRequests],
    );
}
