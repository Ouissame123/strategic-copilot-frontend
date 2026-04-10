import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useToast } from "@/providers/toast-provider";
export function TalentMissionsWorkspacePage() {
    const { t } = useTranslation("common");
    useCopilotPage("projects", t("workspace.talentMisTitle"));

    return (
        <WorkspacePageShell
            role="talent"
            eyebrow={t("workspace.talentMisEyebrow")}
            title={t("workspace.talentMisTitle")}
            description={t("workspace.talentMisDesc")}
        >
            <div className="space-y-3">
                {[
                    { id: "1", name: "Orion — Lot UI", state: "En cours" },
                    { id: "2", name: "Beta — Revue données", state: "Bloqué" },
                ].map((m) => (
                    <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80"
                    >
                        <div>
                            <p className="font-medium text-primary">{m.name}</p>
                            <p className="text-xs text-tertiary">{m.state}</p>
                        </div>
                        <Button size="sm" color="secondary" href={`/project/${m.id}`}>
                            Détails
                        </Button>
                    </div>
                ))}
            </div>
        </WorkspacePageShell>
    );
}

export function TalentTrainingWorkspacePage() {
    const { t } = useTranslation("common");
    const { push } = useToast();
    const [cert, setCert] = useState("");
    const [error, setError] = useState<string | null>(null);
    useCopilotPage("profile", t("workspace.talentTrainTitle"));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (cert.trim().length < 3) {
            setError("Libellé trop court (min. 3 caractères).");
            return;
        }
        setError(null);
        push(t("workspace.saved"), "success");
    };

    return (
        <WorkspacePageShell
            role="talent"
            eyebrow={t("workspace.talentTrainEyebrow")}
            title={t("workspace.talentTrainTitle")}
            description={t("workspace.talentTrainDesc")}
        >
            <form
                onSubmit={submit}
                className="max-w-lg space-y-4 rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80"
            >
                <Input label="Certification visée" placeholder="ex. AWS Practitioner" value={cert} onChange={setCert} />
                {error && <p className="text-sm font-medium text-utility-error-700 dark:text-utility-error-300">{error}</p>}
                <div>
                    <label className="mb-1 block text-sm font-medium text-secondary">Justificatif (démo)</label>
                    <input type="file" className="text-sm text-tertiary" disabled />
                </div>
                <Button type="submit" color="primary" size="sm">
                    Enregistrer le parcours
                </Button>
                <p className="text-xs text-tertiary">
                    Profil détaillé : <Link to="/profile" className="font-semibold text-brand-secondary underline">Profil</Link>
                </p>
            </form>
        </WorkspacePageShell>
    );
}
