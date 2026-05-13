import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useTeam } from "@/hooks/useTeam";

export function ManagerTeamPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { data, isLoading } = useTeam({ scope: "mine", limit: 50 });

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("nav:managerNavTeam")}
            description={t("managerWorkspace.shell.teamDescription")}
        >
            {isLoading ? <p>{t("loading")}</p> : null}
            <div className="space-y-2">
                {(data?.talents ?? []).map((talent) => (
                    <div key={talent.id} className="rounded-lg border border-secondary p-3">
                        <p className="font-medium">{talent.full_name}</p>
                        <p className="text-sm text-tertiary">
                            {t("managerWorkspace.shell.teamAllocationLine", {
                                pct: talent.total_allocation_pct,
                                count: talent.active_alerts_count,
                            })}
                        </p>
                    </div>
                ))}
            </div>
        </WorkspacePageShell>
    );
}
