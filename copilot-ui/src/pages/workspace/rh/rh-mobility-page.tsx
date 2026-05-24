import { RhMobilityStaffing } from "@/components/rh/mobility/RhMobilityStaffing";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { authStorage } from "@/lib/auth-storage";
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

/** Route `/workspace/rh/mobility` — centre staffing WF_RH_Assignments. */
export default function RhMobilityPage() {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const token = authStorage.getAccessToken() ?? undefined;

    useCopilotPage("rh_mobility", { enterpriseId, view: "assignments_staffing" });

    const apiBase =
        (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim() || RH_DASHBOARD_WEBHOOK_BASE;

    if (!enterpriseId) {
        return (
            <div className={cx("p-4", RH_ALERT_WARN)}>
                Connectez-vous avec un compte RH lié à une entreprise pour gérer les affectations.
            </div>
        );
    }

    return <RhMobilityStaffing enterpriseId={enterpriseId} apiBase={apiBase} token={token} />;
}
