import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Moon, Sun } from "lucide-react";
import { applyDocumentUiLang, writeStoredUiLang, type UiLang } from "@/lib/ui-locale";
import { usePrefersColorSchemeDark } from "@/hooks/use-prefers-color-scheme-dark";
import { useTheme } from "@/providers/theme-provider";
import { RH_PROFILE_CARD, RH_PROFILE_LABEL } from "../profile-ui";
import { cx } from "@/utils/cx";

const LANGS: { code: UiLang; labelKey: "language.fr" | "language.en" }[] = [
    { code: "fr", labelKey: "language.fr" },
    { code: "en", labelKey: "language.en" },
];

function useResolvedAppearance(): "light" | "dark" {
    const { theme } = useTheme();
    const systemDark = usePrefersColorSchemeDark();
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return systemDark ? "dark" : "light";
}

/** Préférences UI — mêmes stores que LanguageSwitcher / ThemeToggle du header. */
export function PreferencesCard() {
    const { i18n, t } = useTranslation("common");
    const { setTheme } = useTheme();
    const appearance = useResolvedAppearance();

    const activeLang = useMemo((): UiLang => {
        const lng = i18n.resolvedLanguage ?? i18n.language;
        return lng.startsWith("en") ? "en" : "fr";
    }, [i18n.language, i18n.resolvedLanguage]);

    const selectLanguage = useCallback(
        (code: UiLang) => {
            writeStoredUiLang(code);
            applyDocumentUiLang(code);
            void i18n.changeLanguage(code);
        },
        [i18n],
    );

    return (
        <section className={cx(RH_PROFILE_CARD, "p-5 sm:p-6")}>
            <header className="mb-5 flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                    <Languages className="size-5" aria-hidden />
                </span>
                <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Préférences</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Langue et thème d’affichage.</p>
                </div>
            </header>

            <div className="space-y-5">
                <div className="grid gap-2">
                    <span className={RH_PROFILE_LABEL} id="rh-pref-lang-label">
                        Langue
                    </span>
                    <div
                        className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
                        role="group"
                        aria-labelledby="rh-pref-lang-label"
                    >
                        {LANGS.map((lang) => {
                            const pressed = activeLang === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    aria-pressed={pressed}
                                    onClick={() => selectLanguage(lang.code)}
                                    className={cx(
                                        "rounded-full px-3 py-1.5 text-sm font-medium outline-none transition",
                                        "focus-visible:ring-2 focus-visible:ring-primary-500/40",
                                        pressed
                                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                                    )}
                                >
                                    {t(lang.labelKey)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-2">
                    <span className={RH_PROFILE_LABEL} id="rh-pref-theme-label">
                        Thème
                    </span>
                    <div
                        className="inline-flex w-fit items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
                        role="group"
                        aria-labelledby="rh-pref-theme-label"
                    >
                        <button
                            type="button"
                            aria-label={t("theme.light")}
                            aria-pressed={appearance === "light"}
                            onClick={() => setTheme("light")}
                            className={cx(
                                "flex size-9 items-center justify-center rounded-full outline-none transition",
                                "focus-visible:ring-2 focus-visible:ring-primary-500/40",
                                appearance === "light"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                            )}
                        >
                            <Sun className="size-4" aria-hidden />
                        </button>
                        <button
                            type="button"
                            aria-label={t("theme.dark")}
                            aria-pressed={appearance === "dark"}
                            onClick={() => setTheme("dark")}
                            className={cx(
                                "flex size-9 items-center justify-center rounded-full outline-none transition",
                                "focus-visible:ring-2 focus-visible:ring-primary-500/40",
                                appearance === "dark"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                            )}
                        >
                            <Moon className="size-4" aria-hidden />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
