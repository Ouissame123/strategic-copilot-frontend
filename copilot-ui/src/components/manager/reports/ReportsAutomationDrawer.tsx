import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ReportAudience } from "./reports-shared";
import type { AutomationFrequency, AutomationTemplateKey, ReportAutomation } from "./reports-automation";

export type AutomationDrawerValues = {
    templateKey: AutomationTemplateKey;
    audience: Exclude<ReportAudience, "all">;
    recipients: string;
    frequency: AutomationFrequency;
    dayOfWeek: string;
    dayOfMonth: string;
    time: string;
    language: "fr" | "en";
    format: "pdf" | "csv" | "xlsx";
};

type ReportsAutomationDrawerProps = {
    open: boolean;
    editing: ReportAutomation | null;
    onClose: () => void;
    onSave: (values: AutomationDrawerValues, editingId: string | null) => void;
    saving?: boolean;
};

const TEMPLATE_OPTIONS: { value: AutomationTemplateKey; label: string }[] = [
    { value: "board_pack", label: "Pack comité exécutif" },
    { value: "global_enterprise", label: "Rapport global entreprise" },
    { value: "project_dossier", label: "Rapport détaillé par projet" },
    { value: "hr_talents", label: "Rapport RH & talents" },
    { value: "risks_alerts", label: "Rapport risques & alertes" },
    { value: "decisions_ai", label: "Rapport décisions IA" },
];

const AUDIENCE_OPTIONS: { value: Exclude<ReportAudience, "all">; label: string }[] = [
    { value: "direction", label: "Direction" },
    { value: "rh", label: "RH" },
    { value: "project", label: "Projet" },
    { value: "risks", label: "Risques" },
];

const inputCls =
    "rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function automationToForm(a: ReportAutomation): AutomationDrawerValues {
    return {
        templateKey: a.templateKey,
        audience: a.audience,
        recipients: a.recipients.join(", "),
        frequency: a.frequency,
        dayOfWeek: String(a.dayOfWeek ?? 1),
        dayOfMonth: String(a.dayOfMonth ?? 1),
        time: a.time,
        language: a.language,
        format: a.format,
    };
}

const emptyForm = (): AutomationDrawerValues => ({
    templateKey: "board_pack",
    audience: "direction",
    recipients: "",
    frequency: "weekly",
    dayOfWeek: "1",
    dayOfMonth: "1",
    time: "08:00",
    language: "fr",
    format: "pdf",
});

export function ReportsAutomationDrawer({ open, editing, onClose, onSave, saving }: ReportsAutomationDrawerProps) {
    const [form, setForm] = useState<AutomationDrawerValues>(emptyForm);

    useEffect(() => {
        if (open) setForm(editing ? automationToForm(editing) : emptyForm());
    }, [open, editing]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    return (
        <>
            <button
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                className={[
                    "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300",
                    open ? "opacity-100" : "pointer-events-none opacity-0",
                ].join(" ")}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={editing ? "Modifier l'automatisation" : "Nouvelle automatisation"}
                className={[
                    "fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900/95",
                    open ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                <header className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4 dark:border-slate-800">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600">Automatisation</p>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {editing ? "Modifier" : "Nouvelle automatisation"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="grid gap-4">
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Template rapport</span>
                            <select
                                value={form.templateKey}
                                onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value as AutomationTemplateKey }))}
                                className={inputCls}
                            >
                                {TEMPLATE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Audience</span>
                            <select
                                value={form.audience}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, audience: e.target.value as Exclude<ReportAudience, "all"> }))
                                }
                                className={inputCls}
                            >
                                {AUDIENCE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Destinataires</span>
                            <input
                                type="text"
                                value={form.recipients}
                                onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
                                placeholder="email@entreprise.com, …"
                                className={inputCls}
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Fréquence</span>
                            <select
                                value={form.frequency}
                                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as AutomationFrequency }))}
                                className={inputCls}
                            >
                                <option value="daily">Quotidien</option>
                                <option value="weekly">Hebdomadaire</option>
                                <option value="monthly">Mensuel</option>
                            </select>
                        </label>
                        {form.frequency === "weekly" ? (
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Jour</span>
                                <select
                                    value={form.dayOfWeek}
                                    onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
                                    className={inputCls}
                                >
                                    <option value="1">Lundi</option>
                                    <option value="2">Mardi</option>
                                    <option value="3">Mercredi</option>
                                    <option value="4">Jeudi</option>
                                    <option value="5">Vendredi</option>
                                    <option value="6">Samedi</option>
                                    <option value="0">Dimanche</option>
                                </select>
                            </label>
                        ) : null}
                        {form.frequency === "monthly" ? (
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Jour du mois</span>
                                <select
                                    value={form.dayOfMonth}
                                    onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                                    className={inputCls}
                                >
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                                        <option key={d} value={String(d)}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Heure</span>
                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                className={inputCls}
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Langue</span>
                                <select
                                    value={form.language}
                                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as "fr" | "en" }))}
                                    className={inputCls}
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                </select>
                            </label>
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Format</span>
                                <select
                                    value={form.format}
                                    onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as "pdf" | "csv" | "xlsx" }))}
                                    className={inputCls}
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="csv">CSV</option>
                                    <option value="xlsx">Excel</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

                <footer className="border-t border-slate-200/60 p-5 dark:border-slate-800">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => onSave(form, editing?.id ?? null)}
                        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
                    >
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </footer>
            </aside>
        </>
    );
}
