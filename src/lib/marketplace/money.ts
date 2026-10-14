import type { Locale } from "@/lib/i18n";

const INTL: Record<Locale, string> = {
  en: "en-ET",
  om: "en-ET",
  am: "am-ET",
  so: "so-ET",
};

/** Whole birr plus up to two santim digits. Rejects floats and scientific notation. */
export function etbToSantim(input: string): number | null {
  const match = input.trim().match(/^(\d{1,12})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const birr = Number(match[1]);
  if (!Number.isSafeInteger(birr)) return null;
  const frac = Number((match[2] ?? "").padEnd(2, "0") || "0");
  const santim = birr * 100 + frac;
  if (!Number.isSafeInteger(santim)) return null;
  return santim;
}

export function formatEtb(santim: number, locale: Locale): string {
  const sign = santim < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(santim));
  const birr = Math.floor(abs / 100);
  const frac = abs % 100;
  const whole = new Intl.NumberFormat(INTL[locale]).format(birr);
  if (frac === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}
