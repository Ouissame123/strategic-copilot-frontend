import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";

export default function RhAccountsWorkspacePage() {
    const { t } = useTranslation("common");
    useCopilotPage("users", t("workspace.rhAccountsTitle"));

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspace.rhAccountsEyebrow")}
            title={t("workspace.rhAccountsTitle")}
            description={t("workspace.rhAccountsDesc")}
            actions={
                <Button color="primary" size="sm" href="/users">
                    Ouvrir la liste utilisateurs
                </Button>
            }
        >
            <div className="rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80">
                <p className="text-sm text-secondary">
                    Vue condensée : utilisez la{" "}
                    <Link to="/users" className="font-semibold text-brand-secondary underline">
                        gestion des utilisateurs
                    </Link>{" "}
                    pour les rôles, statuts et validations.
                </p>
            </div>
        </WorkspacePageShell>
    );
}
