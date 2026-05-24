import { useNavigate } from "react-router";
import { DashboardRH } from "@/components/rh/DashboardRH";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { authStorage } from "@/lib/auth-storage";
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

/** Route `/workspace/rh/dashboard` — données réelles WF_RH_Analytics. */
export default function RhDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const token = authStorage.getAccessToken() ?? undefined;

    useCopilotPage("rh_dashboard", { enterpriseId, view: "analytics" });

    if (!enterpriseId) {
        return (
            <div className={cx("p-4", RH_ALERT_WARN)}>
                Connectez-vous avec un compte RH lié à une entreprise pour afficher le dashboard.
            </div>
        );
    }

    const apiBase =
        (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim() || RH_DASHBOARD_WEBHOOK_BASE;

    return (
        <DashboardRH
            enterpriseId={enterpriseId}
            apiBase={apiBase}
            token={token}
            onOpenTalents={() => navigate("/workspace/rh/employees")}
        />
    );
}
