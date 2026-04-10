import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/providers/toast-provider";
import { useCopilotPage } from "@/hooks/use-copilot-page";

export function RhTalentWorkspaceLayout() {
    const { t } = useTranslation("common");
    const tabs = useMemo(
        () => [
            { href: "/workspace/rh/talent", label: t("workspace.tabOverview"), end: true },
            { href: "/workspace/rh/talent/profiles", label: t("workspace.tabProfiles") },
            { href: "/workspace/rh/talent/gaps", label: t("workspace.tabGaps") },
            { href: "/workspace/rh/talent/staffing", label: t("workspace.tabStaffing") },
        ],
        [t],
    );

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspace.rhTalentEyebrow")}
            title={t("workspace.rhTalentTitle")}
            description={t("workspace.rhTalentDesc")}
            tabs={tabs}
        >
            <Outlet />
        </WorkspacePageShell>
    );
}

export function RhTalentOverviewTab() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    useCopilotPage("dashboard", t("workspace.rhTalentTitle"));

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Validation</p>
                    <p className="mt-2 text-sm text-secondary">3 candidatures en attente de relecture RH.</p>
                    <Button color="primary" size="sm" className="mt-4" onClick={() => setConfirmOpen(true)}>
                        Valider la file
                    </Button>
                </div>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Alertes</p>
                    <p className="mt-2 text-sm text-secondary">1 écart critique sur compétence « Data ».</p>
                    <Button color="secondary" size="sm" className="mt-4" onClick={() => push(t("workspace.actionSimulated"), "success")}>
                        Marquer comme vu
                    </Button>
                </div>
            </div>
            <ConfirmDialog
                isOpen={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Validation groupée"
                body={t("workspace.confirmSensitive")}
                confirmLabel="Confirmer"
                cancelLabel="Annuler"
                onConfirm={() => push(t("workspace.saved"), "success")}
            />
        </div>
    );
}

export function RhTalentProfilesTab() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    useCopilotPage("dashboard", t("workspace.rhProfilesTitle"));

    return (
        <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
            <p className="text-sm font-semibold text-primary">{t("workspace.rhProfilesTitle")}</p>
            <ul className="mt-6 divide-y divide-secondary">
                {["A. Martin — Product", "S. Ali — Data", "L. Bernard — Ops"].map((row) => (
                    <li key={row} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                        <span className="text-sm text-secondary">{row}</span>
                        <Button size="sm" color="secondary" onClick={() => push(t("workspace.actionSimulated"), "neutral")}>
                            Ouvrir fiche
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function RhTalentGapsTab() {
    const { t } = useTranslation("common");
    useCopilotPage("dashboard", t("workspace.rhGapsTitle"));

    return (
        <div className="rounded-2xl border border-dashed border-secondary bg-primary_alt/50 p-6 text-center">
            <p className="text-sm font-medium text-primary">{t("workspace.rhGapsTitle")}</p>
            <p className="mt-2 text-sm text-tertiary">Analyse connectée aux indicateurs de charge (démo).</p>
        </div>
    );
}

export function RhTalentStaffingTab() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    const [loading, setLoading] = useState(false);
    const [completeAfter, setCompleteAfter] = useState(false);
    useCopilotPage("dashboard", t("workspace.rhStaffingTitle"));

    useEffect(() => {
        if (!completeAfter) return;
        const timerId = setTimeout(() => {
            setLoading(false);
            setCompleteAfter(false);
            push(t("workspace.saved"), "success");
        }, 900);
        return () => clearTimeout(timerId);
    }, [completeAfter, push, t]);

    return (
        <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
            <p className="text-sm font-semibold text-primary">{t("workspace.rhStaffingTitle")}</p>
            <p className="mt-2 text-sm text-tertiary">Proposition d’affectation pour le projet « Alpha ».</p>
            <Button
                color="primary"
                size="sm"
                className="mt-4"
                isLoading={loading}
                onClick={() => {
                    if (loading) return;
                    setLoading(true);
                    setCompleteAfter(true);
                }}
            >
                Envoyer la proposition
            </Button>
        </div>
    );
}
