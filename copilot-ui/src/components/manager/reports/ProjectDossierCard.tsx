import { useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import type { ProjectDossierGenerateParams } from "@/api/manager-reports.api";
import { Button } from "@/components/base/buttons/button";
import { useGenerateProjectDossier } from "@/hooks/use-manager-reports";
import { useProjects } from "@/hooks/useProjects";
import { cx } from "@/utils/cx";

function FormRow({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
    return (
        <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-500">
                {label}
                {required ? " *" : ""}
            </span>
            {children}
        </label>
    );
}

const selectClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function ProjectDossierCard() {
    const [params, setParams] = useState<ProjectDossierGenerateParams>({
        project_id: "",
        language: "fr",
        includeRisks: true,
        includeDecisions: true,
        includeTeam: true,
    });
    const projects = useProjects({ limit: 100 });
    const generate = useGenerateProjectDossier();
    const canGenerate = Boolean(params.project_id.trim());

    return (
        <article className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <header className="mb-3 flex items-center gap-2">
                <FileText className="size-5 text-primary-600" aria-hidden />
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Dossier projet</h3>
                <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-700 dark:bg-primary-950/50 dark:text-primary-200">
                    PDF
                </span>
            </header>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Focus sur un projet : KPI, équipe, risques, décisions Copilot.
            </p>

            <div className="space-y-3">
                <FormRow label="Projet" required>
                    <select
                        value={params.project_id}
                        onChange={(e) => setParams((p) => ({ ...p, project_id: e.target.value }))}
                        className={selectClass}
                    >
                        <option value="">— Sélectionner —</option>
                        {(projects.data?.items ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </FormRow>

                <FormRow label="Langue">
                    <select
                        value={params.language}
                        onChange={(e) =>
                            setParams((p) => ({ ...p, language: e.target.value as ProjectDossierGenerateParams["language"] }))
                        }
                        className={selectClass}
                    >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                    </select>
                </FormRow>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={params.includeRisks}
                            onChange={(e) => setParams((p) => ({ ...p, includeRisks: e.target.checked }))}
                            className="rounded border-slate-300"
                        />
                        Risques
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={params.includeDecisions}
                            onChange={(e) => setParams((p) => ({ ...p, includeDecisions: e.target.checked }))}
                            className="rounded border-slate-300"
                        />
                        Décisions
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={params.includeTeam}
                            onChange={(e) => setParams((p) => ({ ...p, includeTeam: e.target.checked }))}
                            className="rounded border-slate-300"
                        />
                        Équipe
                    </label>
                </div>
            </div>

            <Button
                type="button"
                color="primary"
                className={cx("mt-4 w-full justify-center")}
                isLoading={generate.isPending}
                isDisabled={!canGenerate || generate.isPending}
                onClick={() => generate.mutate(params)}
            >
                Générer le PDF
            </Button>
        </article>
    );
}
