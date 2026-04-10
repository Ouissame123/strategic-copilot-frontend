import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { decisionHighlightCardClass } from "@/utils/workspace-role-styles";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export function ManagerProjectsWorkspacePage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push } = useToast();
    useCopilotPage("projects", t("workspace.managerWsTitle"));

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspace.managerWsEyebrow")}
            title={t("workspace.managerWsTitle")}
            description={t("workspace.managerWsDesc")}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button color="secondary" size="sm" href="/projects">
                        Liste projets
                    </Button>
                    <Button color="primary" size="sm" href="/">
                        {t("nav:dashboard")}
                    </Button>
                </div>
            }
        >
            <div className={cx("p-5", decisionHighlightCardClass())}>
                <p className="text-xs font-semibold uppercase tracking-wide text-utility-warning-800 dark:text-utility-warning-200">
                    Décision
                </p>
                <p className="mt-2 text-sm font-medium text-primary">Projet « Orion » — score de viabilité 72%</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" color="primary" onClick={() => push(t("workspace.actionSimulated"), "success")}>
                        Continuer
                    </Button>
                    <Button size="sm" color="secondary" onClick={() => push(t("workspace.actionSimulated"), "neutral")}>
                        Ajuster
                    </Button>
                    <Button size="sm" color="primary-destructive" onClick={() => push(t("workspace.actionSimulated"), "error")}>
                        Stopper
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-sm font-semibold text-primary">Espace projet groupé</p>
                <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-tertiary">
                    <li>
                        <Link className="text-brand-secondary hover:underline" to="/project/demo-1">
                            Aperçu & détails — démo
                        </Link>
                    </li>
                    <li>Jalons & livrables (suivi)</li>
                    <li>Équipe & accès</li>
                </ul>
            </div>
        </WorkspacePageShell>
    );
}

export function ManagerMonitoringWorkspacePage() {
    const { t } = useTranslation("common");
    useCopilotPage("projects", t("workspace.managerMonTitle"));

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspace.managerMonEyebrow")}
            title={t("workspace.managerMonTitle")}
            description={t("workspace.managerMonDesc")}
        >
            <div className="overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xs ring-1 ring-secondary/80">
                <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-secondary bg-secondary_subtle">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-secondary">Projet</th>
                            <th className="px-4 py-3 font-semibold text-secondary">Charge</th>
                            <th className="px-4 py-3 font-semibold text-secondary">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-secondary">
                            <td className="px-4 py-3 text-primary">Orion</td>
                            <td className="px-4 py-3 text-tertiary">78%</td>
                            <td className="px-4 py-3">
                                <span className="rounded-full bg-utility-warning-100 px-2 py-0.5 text-xs font-medium text-utility-warning-800 dark:bg-utility-warning-950/50 dark:text-utility-warning-100">
                                    Attention
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </WorkspacePageShell>
    );
}
