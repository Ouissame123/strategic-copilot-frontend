export const UI_LANG_STORAGE_KEY = "strategic-copilot-ui-lang";

export type UiLang = "fr" | "en" | "ar";

export function readStoredUiLang(fallback: UiLang = "fr"): UiLang {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(UI_LANG_STORAGE_KEY)?.trim();
    if (raw === "fr" || raw === "en" || raw === "ar") return raw;
    return fallback;
}

export function writeStoredUiLang(lng: UiLang): void {
    try {
        window.localStorage.setItem(UI_LANG_STORAGE_KEY, lng);
    } catch {
        /* quota / private mode */
    }
}

/** Locale BCP 47 pour `toLocaleString` / `toLocaleDateString` selon la langue UI. */
export function localeForDateFormatting(lng: string): string {
    if (lng.startsWith("ar")) return "ar";
    if (lng.startsWith("en")) return "en-US";
    return "fr-FR";
}
