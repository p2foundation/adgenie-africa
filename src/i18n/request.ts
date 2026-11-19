import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import tw from "../messages/tw.json";
import gaa from "../messages/gaa.json";

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

  const messages = { en, fr, tw, gaa }[locale];

  return { locale, messages };
});
