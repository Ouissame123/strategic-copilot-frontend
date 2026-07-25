import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Theme } from "@/providers/theme-provider";
import { applyDocumentUiLang, writeStoredUiLang, type UiLang } from "@/lib/ui-locale";
import { cx } from "@/utils/cx";
import { PROFILE_CARD, PROFILE_INPUT, PROFILE_LABEL, PROFILE_TIMEZONES, type ManagerAccountPrefs } from "./profile-shared";

type ProfileTabAccountProps = {
    fullName: string;
    email: string;
    prefs: ManagerAccountPrefs;
    theme: Theme;
    onFullNameChange: (v: string) => void;
    onEmailChange: (v: string) => void;
    onPrefsChange: (prefs: ManagerAccountPrefs) => void;
    onThemeChange: (theme: Theme) => void;
    onSubmit: () => void;
    saving?: boolean;
    canSave: boolean;
    fieldErrors?: { fullName?: string; email?: string };
};

const LANGUAGES: { value: ManagerAccountPrefs["language"]; label: string }[] = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

const THEMES: { value: Theme; label: string }[] = [
    { value: "system", label: "Auto" },
    { value: "light", label: "Clair" },
    { value: "dark", label: "Sombre" },
];

export function ProfileTabAccount({
    fullName,
    email,
    prefs,
    theme,
    onFullNameChange,
    onEmailChange,
    onPrefsChange,
    onThemeChange,
    onSubmit,
    saving,
    canSave,
    fieldErrors,
}: ProfileTabAccountProps) {
    const { i18n } = useTranslation("common");

    const handleLanguageChange = (language: ManagerAccountPrefs["language"]) => {
        onPrefsChange({ ...prefs, language });
        if (language === "fr" || language === "en") {
            const ui: UiLang = language;
            writeStoredUiLang(ui);
            applyDocumentUiLang(ui);
            void i18n.changeLanguage(ui);
        }
    };

    return (
        <section className={PROFILE_CARD + " p-5 sm:p-6"}>
            <header className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Compte</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Informations personnelles, langue et apparence de l&apos;interface.
                </p>
            </header>

            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 sm:col-span-2">
                        <span className={PROFILE_LABEL}>Nom complet</span>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => onFullNameChange(e.target.value)}
                            required
                            className={cx(PROFILE_INPUT, fieldErrors?.fullName && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20")}
                        />
                        {fieldErrors?.fullName ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400">{fieldErrors.fullName}</span>
                        ) : null}
                    </label>

                    <label className="grid gap-1.5 sm:col-span-2">
                        <span className={PROFILE_LABEL}>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            required
                            className={cx(PROFILE_INPUT, fieldErrors?.email && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20")}
                        />
                        {fieldErrors?.email ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</span>
                        ) : null}
                    </label>

                    <label className="grid gap-1.5">
                        <span className={PROFILE_LABEL}>Langue</span>
                        <select
                            value={prefs.language}
                            onChange={(e) => handleLanguageChange(e.target.value as ManagerAccountPrefs["language"])}
                            className={PROFILE_INPUT}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.value} value={l.value}>
                                    {l.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1.5">
                        <span className={PROFILE_LABEL}>Fuseau horaire</span>
                        <select
                            value={prefs.timezone}
                            onChange={(e) => onPrefsChange({ ...prefs, timezone: e.target.value })}
                            className={PROFILE_INPUT}
                        >
                            {PROFILE_TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="grid gap-1.5 sm:col-span-2">
                        <span className={PROFILE_LABEL}>Thème</span>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Thème">
                            {THEMES.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => onThemeChange(t.value)}
                                    className={cx(
                                        "rounded-xl border px-4 py-2 text-sm font-medium transition",
                                        theme === t.value
                                            ? "border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-300"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                    <button
                        type="submit"
                        disabled={!canSave || saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </form>
        </section>
    );
}
