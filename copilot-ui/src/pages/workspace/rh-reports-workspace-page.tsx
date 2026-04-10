import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/base/buttons/button";

export default function RhReportsWorkspacePage() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    useCopilotPage("dashboard", t("workspace.rhReportsTitle"));

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspace.rhReportsEyebrow")}
            title={t("workspace.rhReportsTitle")}
            description={t("workspace.rhReportsDesc")}
        >
            <div className="grid gap-4 lg:grid-cols-3">
                {["Staffing", "Risque", "Adoption"].map((label) => (
                    <div
                        key={label}
                        className="flex min-h-32 flex-col justify-between rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80"
                    >
                        <span className="text-xs font-semibold uppercase tracking-wide text-quaternary">{label}</span>
                        <span className="text-2xl font-semibold text-primary">—</span>
                        <Button size="sm" color="secondary" onClick={() => push(t("workspace.actionSimulated"), "neutral")}>
                            Actualiser
                        </Button>
                    </div>
                ))}
            </div>
        </WorkspacePageShell>
    );
}
