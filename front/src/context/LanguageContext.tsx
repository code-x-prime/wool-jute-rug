import { createContext, useContext, useEffect, ReactNode } from "react";
import en from "../translations/en.json";

// English only - no other languages. All UI text must be in English.
interface LanguageContextType {
    language: "en";
    setLanguage: (_lang: string) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dir: "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const setLanguage = () => {}; // No-op, English only

    const t = (path: string, params?: Record<string, string | number>): string => {
        const keys = path.split(".");
        let current: unknown = en;
        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = (current as Record<string, unknown>)[key];
            } else {
                return path;
            }
        }
        if (typeof current !== "string") return path;
        if (params) {
            return Object.entries(params).reduce(
                (s, [k, v]) => s.replace(new RegExp(`{${k}}`, "g"), String(v)),
                current
            );
        }
        return current;
    };

    useEffect(() => {
        document.documentElement.dir = "ltr";
        document.documentElement.lang = "en";
    }, []);

    return (
        <LanguageContext.Provider value={{ language: "en", setLanguage, t, dir: "ltr" }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
