import { Loader2, Sparkles } from "lucide-react";
import { PROFILE_CARD, PROFILE_INPUT, PROFILE_LABEL, type ManagerAiPrefs } from "./profile-shared";

const DETAIL_LEVELS: { value: ManagerAiPrefs["detailLevel"]; label: string }[] = [
    { value: "synthesis", label: "Synthèse" },
    { value: "detailed", label: "Détaillé" },
    { value: "expert", label: "Expert" },
];

const RESPONSE_LANGS: { value: ManagerAiPrefs["responseLanguage"]; label: string }[] = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

type ProfileTabAiPreferencesProps = {
    prefs: ManagerAiPrefs;
    onChange: (prefs: ManagerAiPrefs) => void;
    onSave: () => void;
    saving?: boolean;
    canSave: boolean;
};

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600 dark:bg-slate-700" />
                <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </label>
        </div>
    );
}

export function ProfileTabAiPreferences({ prefs, onChange, onSave, saving, canSave }: ProfileTabAiPreferencesProps) {
    return (
        <section className={PROFILE_CARD + " p-5 sm:p-6"}>
            <header className="mb-6 flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                    <Sparkles className="size-5" aria-hidden />
                </span>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Préférences IA</h2>
                    <p className="mt-1 text-sm text-slate-500">Personnalisez le comportement du Copilot sur votre périmètre manager.</p>
                </div>
            </header>

            <div className="space-y-4">
                <ToggleRow
                    label="Activer Copilot IA"
                    description="Suggestions et analyses contextuelles dans l'espace manager."
                    checked={prefs.copilotEnabled}
                    onChange={(copilotEnabled) => onChange({ ...prefs, copilotEnabled })}
                />
                <ToggleRow
                    label="Mode proactif"
                    description="Le Copilot propose des actions sans attendre une question."
                    checked={prefs.proactiveMode}
                    onChange={(proactiveMode) => onChange({ ...prefs, proactiveMode })}
                />

                <label className="grid gap-1.5">
                    <span className={PROFILE_LABEL}>Langue de réponse</span>
                    <select
                        value={prefs.responseLanguage}
                        onChange={(e) => onChange({ ...prefs, responseLanguage: e.target.value as ManagerAiPrefs["responseLanguage"] })}
                        className={PROFILE_INPUT}
                    >
                        {RESPONSE_LANGS.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid gap-1.5">
                    <span className={PROFILE_LABEL}>Niveau de détail</span>
                    <select
                        value={prefs.detailLevel}
                        onChange={(e) => onChange({ ...prefs, detailLevel: e.target.value as ManagerAiPrefs["detailLevel"] })}
                        className={PROFILE_INPUT}
                    >
                        {DETAIL_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                <button
                    type="button"
                    disabled={!canSave || saving}
                    onClick={onSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
            </div>
        </section>
    );
}
