import type React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import authoredContent from "./content.json";
import portuguese from "./pt.json";

export type Language = "en" | "pt";
export const DEFAULT_LANGUAGE: Language = "en";
const dictionary: Record<string, string> = portuguese;
export function translateText(
  text: string,
  language: Language,
  values: readonly (string | number)[] = [],
): string {
  const translated = language === "pt" ? (dictionary[text] ?? text) : text;
  return translated.replace(/\{(\d+)\}/g, (token, index) => String(values[Number(index)] ?? token));
}
function localize<T>(value: T, language: Language): T {
  if (typeof value === "string") return translateText(value, language) as T;
  if (Array.isArray(value)) return value.map((entry) => localize(entry, language)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, localize(entry, language)]),
    ) as T;
  return value;
}
export function contentForLanguage(language: Language) {
  return localize(authoredContent, language);
}
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void };
// Reuse one context across hot reloads so provider and screens always share it.
const contextStore = globalThis as typeof globalThis & {
  __marsLanguageContext?: React.Context<LanguageContextValue | null>;
};
const LanguageContext = (contextStore.__marsLanguageContext ??=
  createContext<LanguageContextValue | null>(null));
export function GameLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useGameLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Game screens require GameLanguageProvider");
  return {
    ...context,
    content: contentForLanguage(context.language),
    t: (text: string, values?: readonly (string | number)[]) =>
      translateText(text, context.language, values),
  };
}
