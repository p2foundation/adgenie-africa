import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Supported locales
export const locales = ["en", "fr", "tw", "gaa"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  // Read locale from cookie; fall back to default
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale =
    localeCookie && (locales as readonly string[]).includes(localeCookie)
      ? (localeCookie as Locale)
      : defaultLocale;

  const messages = (
    await import(`../../../../shared/i18n/${locale}.json`)
  ).default;

  return { locale, messages };
});
