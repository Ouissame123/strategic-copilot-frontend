import { useCallback, useMemo } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { applyDocumentUiLang, writeStoredUiLang, type UiLang } from "@/lib/ui-locale";

const LANGUAGES = [
    { code: "fr", labelKey: "language.fr" },
    { code: "en", labelKey: "language.en" },
] as const;

function resolveUiLang(code: string): UiLang | null {
    if (code === "fr" || code === "en") return code;
    return null;
}

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation("common");

    const activeLanguage = useMemo(() => {
        const lng = i18n.resolvedLanguage ?? i18n.language;
        return LANGUAGES.find((l) => lng.startsWith(l.code)) ?? LANGUAGES[0];
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
        <Dropdown.Root>
            <Button
                color="secondary"
                size="sm"
                iconTrailing={ChevronDown}
                className="shrink-0 ring-1 ring-secondary/80"
                aria-label={t("languagesMenu")}
                aria-haspopup="menu"
            >
                {t(activeLanguage.labelKey)}
            </Button>
            <Dropdown.Popover className="min-w-[13rem] rounded-xl p-1 shadow-lg ring-1 ring-secondary/80">
                {/* Dropdown.Menu est en selectionMode="none" par défaut → onAction, pas onSelectionChange */}
                <Dropdown.Menu
                    onAction={(key) => {
                        const code = resolveUiLang(String(key));
                        if (code) selectLanguage(code);
                    }}
                >
                    {LANGUAGES.map((lang) => (
                        <Dropdown.Item
                            key={lang.code}
                            id={lang.code}
                            textValue={t(lang.labelKey)}
                            label={t(lang.labelKey)}
                            addon={activeLanguage.code === lang.code ? "✓" : undefined}
                        />
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};
