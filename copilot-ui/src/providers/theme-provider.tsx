import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePrefersColorSchemeDark } from "@/hooks/use-prefers-color-scheme-dark";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
    /**
     * The class to add to the root element when the theme is dark
     * @default "dark-mode"
     */
    darkModeClass?: string;
    /** The default theme to use on startup. @default "system" */
    defaultTheme?: Theme;
}

const THEME_STORAGE_KEY = "ui_theme";

function readStoredTheme(defaultTheme: Theme): Theme {
    if (typeof window === "undefined") return defaultTheme;
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return defaultTheme;
}

export const ThemeProvider = ({ children, defaultTheme = "system", darkModeClass = "dark-mode" }: ThemeProviderProps) => {
    const [theme, setTheme] = useState<Theme>(() => readStoredTheme(defaultTheme));

    const prefersDark = usePrefersColorSchemeDark();

    useEffect(() => {
        const root = window.document.documentElement;

        if (theme === "system") {
            root.classList.toggle(darkModeClass, prefersDark);
        } else {
            root.classList.toggle(darkModeClass, theme === "dark");
        }
    }, [theme, prefersDark, darkModeClass]);

    useEffect(() => {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
