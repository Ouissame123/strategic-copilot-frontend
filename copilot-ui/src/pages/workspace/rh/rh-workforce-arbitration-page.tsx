import { WorkforceArbitrationView } from "@/components/rh/workforce-arbitration/WorkforceArbitrationView";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { authStorage } from "@/lib/auth-storage";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

/** Route `/workspace/rh/workforce-arbitration` — WF_RH_Matching_Run. */
export default function RhWorkforceArbitrationPage() {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const token = authStorage.getAccessToken() ?? undefined;

    useCopilotPage("rh_workforce_arbitration", { enterpriseId, view: "matching_run" });

    if (!enterpriseId) {
        return (
            <div className={cx("p-4", RH_ALERT_WARN)}>
                Connectez-vous avec un compte RH lié à une entreprise pour accéder au matching workforce.
            </div>
        );
    }

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH Intelligence"
            title="Workforce Arbitration"
            description="AI-powered talent matching and strategic workforce balancing."
            omitHeader
        >
            <WorkforceArbitrationView token={token} />
        </WorkspacePageShell>
    );
}
