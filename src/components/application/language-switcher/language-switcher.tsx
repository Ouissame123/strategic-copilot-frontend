import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";

const LANGUAGES = [
    { code: "fr", labelKey: "language.fr" },
    { code: "en", labelKey: "language.en" },
    { code: "ar", labelKey: "language.ar" },
] as const;

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation("common");

    return (
        <div className="inline-flex items-center gap-1 rounded-full border border-secondary bg-primary px-2 py-0.5 text-xs shadow-xs">
            {LANGUAGES.map((lang) => {
                const isActive = i18n.language.startsWith(lang.code);

                return (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className={cx(
                            "rounded-full px-2 py-0.5 transition duration-100 ease-linear",
                            isActive
                                ? "bg-brand-primary text-white"
                                : "text-secondary hover:bg-primary_hover",
                        )}
                    >
                        {t(lang.labelKey)}
                    </button>
                );
            })}
        </div>
    );
};

