import { am } from "./am";
import { en } from "./en";
import type { Dict } from "./en-type";
import { om } from "./om";
import { so } from "./so";

export type { Dict };
export type Locale = "en" | "om" | "am" | "so";

export const LOCALES: readonly Locale[] = ["en", "om", "am", "so"];

/** Locales whose interface copy still needs a human reviewer. */
export const TRANSLATION_REVIEW: readonly Locale[] = ["om", "am", "so"];

const ALL: Record<Locale, Dict> = { en, om, am, so };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "om" || value === "am" || value === "so";
}

export function dict(locale: Locale): Dict {
  return ALL[locale];
}

export const LOCALE_STORAGE_KEY = "bultum-locale";

export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = locale;
}
