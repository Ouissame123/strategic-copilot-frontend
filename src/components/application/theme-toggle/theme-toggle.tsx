import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/theme-provider";

export const ThemeToggle = () => {
    const { t } = useTranslation("common");
    const { theme, setTheme } = useTheme();

    const nextTheme = theme === "dark" ? "light" : "dark";
    const modeLabel = nextTheme === "dark" ? t("theme.dark") : t("theme.light");

    return (
        <button
            type="button"
            className="rounded-full border border-secondary bg-primary px-3 py-1 text-sm text-secondary shadow-xs transition duration-100 ease-linear hover:bg-primary_hover"
            onClick={() => setTheme(nextTheme)}
        >
            {t("theme.switch_to", { mode: modeLabel })}
        </button>
    );
};

