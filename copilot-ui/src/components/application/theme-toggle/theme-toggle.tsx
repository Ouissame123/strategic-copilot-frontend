import { Moon01, Sun } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { usePrefersColorSchemeDark } from "@/hooks/use-prefers-color-scheme-dark";
import { useTheme } from "@/providers/theme-provider";
import { cx } from "@/utils/cx";

/** Résolu clair / sombre (inclut le mode système). */
function useResolvedAppearance(): "light" | "dark" {
    const { theme } = useTheme();
    const systemDark = usePrefersColorSchemeDark();

    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return systemDark ? "dark" : "light";
}

export const ThemeToggle = () => {
    const { t } = useTranslation("common");
    const { setTheme } = useTheme();
    const appearance = useResolvedAppearance();

    return (
        <div
            className="inline-flex items-center rounded-full border border-secondary bg-secondary_subtle p-0.5 shadow-xs ring-1 ring-secondary/80"
            role="group"
            aria-label={t("theme.toggleGroup")}
        >
            <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label={t("theme.light")}
                aria-pressed={appearance === "light"}
                className={cx(
                    "flex size-8 items-center justify-center rounded-full transition duration-150 ease-out outline-focus-ring",
                    "focus-visible:outline-2 focus-visible:outline-offset-2",
                    appearance === "light"
                        ? "bg-primary text-primary shadow-xs ring-1 ring-secondary/70"
                        : "text-quaternary hover:bg-primary/80 hover:text-secondary",
                )}
            >
                <Sun className="size-[18px] shrink-0" aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label={t("theme.dark")}
                aria-pressed={appearance === "dark"}
                className={cx(
                    "flex size-8 items-center justify-center rounded-full transition duration-150 ease-out outline-focus-ring",
                    "focus-visible:outline-2 focus-visible:outline-offset-2",
                    appearance === "dark"
                        ? "bg-primary text-primary shadow-xs ring-1 ring-secondary/70"
                        : "text-quaternary hover:bg-primary/80 hover:text-secondary",
                )}
            >
                <Moon01 className="size-[18px] shrink-0" aria-hidden />
            </button>
        </div>
    );
};
