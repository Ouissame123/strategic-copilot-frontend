import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { patchProject } from "@/api/projects";
import { useToast } from "@/providers/toast-provider";
import type { MissionControlProject } from "@/types/api.types";
import { cx } from "@/utils/cx";

type ProjectPermanentSectionsProps = {
    project: MissionControlProject;
    token: string;
    onDescriptionUpdated: (updated: MissionControlProject) => void;
};

/** Description — layout permanent hors onglets. */
export function ProjectPermanentSections({
    project,
    token,
    onDescriptionUpdated,
}: ProjectPermanentSectionsProps) {
    const { push: showToast } = useToast();

    const [descEditing, setDescEditing] = useState(false);
    const [descValue, setDescValue] = useState("");
    const [descSaving, setDescSaving] = useState(false);
    const [descError, setDescError] = useState<string | null>(null);

    function openEditor(initial = project.description || "") {
        setDescValue(initial);
        setDescEditing(true);
        setDescError(null);
    }

    async function handleSaveDescription() {
        const current = project.description || "";
        if (descValue === current) {
            setDescEditing(false);
            return;
        }

        if (!token.trim()) {
            setDescError("Session expirée — reconnectez-vous");
            return;
        }

        setDescSaving(true);
        setDescError(null);

        try {
            const result = await patchProject(project.id, { description: descValue }, token);
            if (String(result.status).toLowerCase() === "success") {
                onDescriptionUpdated(result.project);
                setDescEditing(false);
                showToast("Description mise à jour", "success");
            } else {
                setDescError(result.message || "Erreur inconnue");
            }
        } catch (e: unknown) {
            setDescError(e instanceof Error ? e.message : "Erreur réseau");
        } finally {
            setDescSaving(false);
        }
    }

    return (
        <div className="rounded-[10px] border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Description</p>
                {!descEditing ? (
                    <button
                        type="button"
                        onClick={() => openEditor()}
                        title="Modifier la description"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:border-primary-300 hover:text-primary-700 dark:border-slate-600 dark:hover:border-primary-700"
                    >
                        <Pencil size={14} aria-hidden />
                        Modifier
                    </button>
                ) : null}
            </div>

            {!descEditing ? (
                project.description ? (
                    <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{project.description}</p>
                ) : (
                    <p className="text-[13px] text-slate-500 italic">
                        Aucune description.{" "}
                        <button
                            type="button"
                            onClick={() => openEditor("")}
                            className="text-primary-600 underline hover:text-primary-700"
                        >
                            Ajouter une description
                        </button>
                    </p>
                )
            ) : (
                <div>
                    <textarea
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        rows={4}
                        placeholder="Décrivez le projet..."
                        autoFocus
                        disabled={descSaving}
                        className={cx(
                            "mb-2 w-full resize-y rounded-lg border bg-slate-50 px-2.5 py-2 text-[13px] leading-relaxed text-slate-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-slate-800 dark:text-slate-100",
                            descError ? "border-rose-500" : "border-slate-300 dark:border-slate-600",
                        )}
                        onKeyDown={(e) => {
                            if (e.key === "Escape" && !descSaving) {
                                setDescEditing(false);
                                setDescError(null);
                            }
                        }}
                    />

                    {descError ? <p className="mb-2 text-xs text-rose-600">{descError}</p> : null}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setDescEditing(false);
                                setDescError(null);
                            }}
                            disabled={descSaving}
                            className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSaveDescription()}
                            disabled={descSaving}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium text-white disabled:cursor-not-allowed",
                                descSaving ? "bg-primary-200 text-primary-800" : "bg-primary-600 hover:bg-primary-700",
                            )}
                        >
                            {descSaving ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" aria-hidden />
                                    Enregistrement…
                                </>
                            ) : (
                                "Enregistrer"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
