export const UI_LANG_STORAGE_KEY = "strategic-copilot-ui-lang";

export type UiLang = "fr" | "en";

export function readStoredUiLang(fallback: UiLang = "fr"): UiLang {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(UI_LANG_STORAGE_KEY)?.trim();
    if (raw === "fr" || raw === "en") return raw;
    if (raw === "ar") return "fr";
    return fallback;
}

export function writeStoredUiLang(lng: UiLang): void {
    try {
        window.localStorage.setItem(UI_LANG_STORAGE_KEY, lng);
    } catch {
        /* quota / private mode */
    }
}

/** Attributs document pour accessibilité, dates et RTL (arabe). */
export function applyDocumentUiLang(lng: string): void {
    if (typeof document === "undefined") return;
    const base = lng.startsWith("en") ? "en" : "fr";
    document.documentElement.lang = base;
    document.documentElement.dir = "ltr";
}

/** Locale BCP 47 pour `toLocaleString` / `toLocaleDateString` selon la langue UI. */
export function localeForDateFormatting(lng: string): string {
    if (lng.startsWith("en")) return "en-US";
    return "fr-FR";
}
