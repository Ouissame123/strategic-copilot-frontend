import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { asRecord } from "@/utils/unwrap-api-payload";

function parseActionRows(raw: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(raw)) return raw.map((x) => asRecord(x));
    const r = asRecord(raw);
    if (Array.isArray(r.items)) return r.items.map((x) => asRecord(x));
    if (Array.isArray(r.data)) return r.data.map((x) => asRecord(x));
    return [];
}

function countPendingRequests(raw: unknown): number {
    const rows = parseActionRows(raw);
    let n = 0;
    for (const row of rows) {
        const s = String(row.status ?? row.state ?? "")
            .trim()
            .toLowerCase();
        if (s === "pending" || s === "open" || s === "new" || s === "submitted" || s === "en_attente") n += 1;
    }
    return n;
}

/** Navigation latérale RH uniquement — URLs sous `/workspace/rh/*`. */
export function useRhWorkspaceNavItems(): NavItemType[] {
    const { t } = useTranslation("nav");
    const { data } = useRhActionsListQuery();
    const pending = useMemo(() => countPendingRequests(data), [data]);

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
                badge: pending > 0 ? String(pending) : undefined,
            },
            { label: t("rhNavMobility"), href: "/workspace/rh/mobility", icon: Share04 },
            { label: t("rhNavAlerts"), href: "/workspace/rh/org-alerts", icon: AlertCircle },
            { label: t("profile"), href: "/workspace/rh/profile", icon: User01 },
        ],
        [t, pending],
    );
}
