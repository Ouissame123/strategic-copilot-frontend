import { useNavigate } from "react-router";
import { TalentsRH } from "@/components/rh/TalentsRH";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { authStorage } from "@/lib/auth-storage";
import { RH_TALENTS_WEBHOOK_BASE } from "@/api/rh-talents.api";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

/** Route `/workspace/rh/employees` — liste talents WF_RH_Talents. */
export default function RhEmployeesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const token = authStorage.getAccessToken() ?? undefined;

    useCopilotPage("rh_employees", { enterpriseId, view: "talents_list" });

    const apiBase =
        (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim() || RH_TALENTS_WEBHOOK_BASE;

    if (!enterpriseId) {
        return (
            <div className={cx("p-4", RH_ALERT_WARN)}>
                Connectez-vous avec un compte RH lié à une entreprise pour afficher les talents.
            </div>
        );
    }

    return (
        <TalentsRH
            enterpriseId={enterpriseId}
            apiBase={apiBase}
            token={token}
            onOpenProject={(id) => navigate(`/projects/${encodeURIComponent(id)}`)}
        />
    );
}
