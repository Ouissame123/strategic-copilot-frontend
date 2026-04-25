import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhOrganizationalAlertsQuery } from "@/hooks/use-rh-workspace-queries";
import { rowsFromRhPayload, pickCell } from "@/utils/rh-api-parse";

export default function RhOrgAlertsPage() {
    const { t } = useTranslation(["common", "nav"]);
    useCopilotPage("none", t("nav:rhNavAlerts"));

    const q = useRhOrganizationalAlertsQuery();
    const rows = useMemo(() => {
        const raw = rowsFromRhPayload(q.data ?? []);
        return raw.map((r, i) => ({ ...r, id: String(r.id ?? `o-${i}`) }));
    }, [q.data]);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavAlerts")}
            description={t("common:rhAlerts.description")}
        >
            {q.isLoading ? <p className="text-sm text-tertiary">{t("common:loading")}</p> : null}
            {q.isError ? (
                <p className="text-sm text-error-primary">{q.error instanceof Error ? q.error.message : String(q.error)}</p>
            ) : null}

            {q.isSuccess && rows.length === 0 ? (
                <p className="text-sm text-tertiary">{t("common:rhAlerts.empty")}</p>
            ) : q.isSuccess ? (
                <ul className="space-y-3">
                    {rows.map((row) => {
                        const type = String(row.type ?? row.alert_type ?? "").toLowerCase();
                        const isUnder = type.includes("under") || type.includes("sous");
                        return (
                            <li
                                key={row.id}
                                className={`rounded-2xl border p-4 shadow-xs ring-1 ${
                                    isUnder
                                        ? "border-brand-secondary/40 bg-brand-secondary/10 ring-brand-secondary/20"
                                        : "border-secondary bg-primary ring-secondary/80"
                                }`}
                            >
                                <p className="text-xs font-semibold uppercase text-quaternary">
                                    {isUnder ? t("common:rhAlerts.badgeUnderused") : pickCell(row, ["type", "category"])}
                                </p>
                                <p className="mt-2 text-sm font-medium text-primary">{pickCell(row, ["title", "label"])}</p>
                                <p className="mt-1 text-sm text-secondary">{pickCell(row, ["message", "description"])}</p>
                                {isUnder ? (
                                    <p className="mt-2 text-xs text-tertiary">{t("common:rhAlerts.underusedHint")}</p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </WorkspacePageShell>
    );
}
