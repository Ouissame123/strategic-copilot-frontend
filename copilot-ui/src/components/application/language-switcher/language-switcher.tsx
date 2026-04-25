import { useMemo } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";

const LANGUAGES = [
    { code: "fr", labelKey: "language.fr" },
    { code: "en", labelKey: "language.en" },
    { code: "ar", labelKey: "language.ar" },
] as const;

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation("common");

    const activeLanguage = useMemo(() => {
        return LANGUAGES.find((l) => i18n.language.startsWith(l.code)) ?? LANGUAGES[0];
    }, [i18n.language]);

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
                <Dropdown.Menu
                    selectedKeys={new Set([activeLanguage.code])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        const key = [...keys][0];
                        if (key) void i18n.changeLanguage(String(key));
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
