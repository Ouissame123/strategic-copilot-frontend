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

export const ThemeProvider = ({ children, defaultTheme = "system", darkModeClass = "dark-mode" }: ThemeProviderProps) => {
    const [theme, setTheme] = useState<Theme>(defaultTheme);

    const prefersDark = usePrefersColorSchemeDark();

    useEffect(() => {
        const root = window.document.documentElement;

        if (theme === "system") {
            root.classList.toggle(darkModeClass, prefersDark);
        } else {
            root.classList.toggle(darkModeClass, theme === "dark");
        }
    }, [theme, prefersDark, darkModeClass]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
