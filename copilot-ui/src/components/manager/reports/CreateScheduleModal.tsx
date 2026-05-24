import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { REPORT_CARD } from "./reports-shared";

export type ScheduleModalPayload = {
    template: "board_pack" | "project_dossier";
    recipients: string;
    frequency: "weekly" | "monthly";
    time: string;
    language: string;
    format: "pdf" | "csv" | "xlsx";
};

type CreateScheduleModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: ScheduleModalPayload) => void;
    saving?: boolean;
};

export function CreateScheduleModal({ open, onClose, onSubmit, saving }: CreateScheduleModalProps) {
    const [template, setTemplate] = useState<"board_pack" | "project_dossier">("board_pack");
    const [recipients, setRecipients] = useState("");
    const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
    const [time, setTime] = useState("08:00");
    const [language, setLanguage] = useState("fr");
    const [format, setFormat] = useState<"pdf" | "csv" | "xlsx">("pdf");

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
            <div className={REPORT_CARD + " relative z-10 w-full max-w-lg p-6 shadow-xl"}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Créer une planification</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="size-5" />
                    </button>
                </div>
                <div className="grid gap-3 text-sm">
                    <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-500">Modèle</span>
                        <select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value as "board_pack" | "project_dossier")}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        >
                            <option value="board_pack">Pack comité exécutif</option>
                            <option value="project_dossier">Rapport détaillé par projet</option>
                        </select>
                    </label>
                    <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-500">Destinataires</span>
                        <input
                            type="text"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            placeholder="email@entreprise.com, …"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1">
                            <span className="text-xs font-medium text-slate-500">Fréquence</span>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="weekly">Hebdomadaire</option>
                                <option value="monthly">Mensuelle</option>
                            </select>
                        </label>
                        <label className="grid gap-1">
                            <span className="text-xs font-medium text-slate-500">Heure</span>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            />
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1">
                            <span className="text-xs font-medium text-slate-500">Langue</span>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="fr">Français</option>
                                <option value="en">English</option>
                            </select>
                        </label>
                        <label className="grid gap-1">
                            <span className="text-xs font-medium text-slate-500">Format</span>
                            <select
                                value={format}
                                onChange={(e) => setFormat(e.target.value as "pdf" | "csv" | "xlsx")}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="pdf">PDF</option>
                                <option value="csv">CSV</option>
                                <option value="xlsx">Excel</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            onSubmit({
                                template,
                                recipients,
                                frequency,
                                time,
                                language,
                                format,
                            })
                        }
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saving ? "Enregistrement…" : "Créer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
