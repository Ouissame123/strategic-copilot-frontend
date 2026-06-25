import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { useTalentRequestsSummary } from "@/hooks/useTalentRequests";
import {
    getTalentWorkspaceFooterNavItems,
    getTalentWorkspaceNavItems,
} from "@/layouts/nav/talent-workspace-nav";

export function useTalentWorkspaceNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");
    const summaryQuery = useTalentRequestsSummary();
    const pendingCount = summaryQuery.data?.by_status?.pending ?? 0;

    return useMemo(() => {
        const items = getTalentWorkspaceNavItems(t);
        return items.map((item) => {
            if (item.href !== "/workspace/talent/requests") return item;
            return {
                ...item,
                badge: pendingCount > 0 ? pendingCount : undefined,
            };
        });
    }, [t, pendingCount]);
}

export function useTalentWorkspaceFooterNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");
    return useMemo(() => getTalentWorkspaceFooterNavItems(t), [t]);
}
