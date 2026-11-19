import type { Metadata, Viewport } from "next";
import { Noto_Sans, Space_Grotesk, Bebas_Neue, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { RouteProgress } from "@/components/layout/route-progress";
import { ConnectionNotice } from "@/components/layout/connection-notice";
import "./globals.css";

// Noto Sans is the UI body face: it renders the Twi/Ga letters ɛ ɔ ŋ that
// many display faces lack, so local-language strings never hit a fallback.
const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

// Two display faces carry the brand-kit looks. Latin subset only, single
// weights, self-hosted and cached — about 55 KB on first paint of a gallery,
// then nothing. Bebas is the poster voice, Playfair the editorial one.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-poster",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AdGenie Africa — AI Marketing for Ghana & Africa",
    template: "%s | AdGenie Africa",
  },
  description:
    "Create stunning ads, videos and captions in English, French, Twi and Ga. Powered by AI. You approve the price before anything is generated.",
  keywords: [
    "AI marketing Ghana",
    "ad generator Africa",
    "Twi Ga ads",
    "mobile money ads",
    "AdGenie",
  ],
  authors: [{ name: "AdGenie Africa" }],
  creator: "AdGenie Africa",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://adgenie.africa"
  ),
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "AdGenie Africa",
    title: "AdGenie Africa — AI Marketing for Ghana",
    description:
      "Brief it. Generate it. Post it. AI ads in English, French, Twi and Ga.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdGenie Africa",
    description: "AI-powered marketing for Ghana and Africa.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${notoSans.variable} ${spaceGrotesk.variable} ${bebasNeue.variable} ${playfair.variable} min-h-screen bg-background antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RouteProgress />
          <ConnectionNotice />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
