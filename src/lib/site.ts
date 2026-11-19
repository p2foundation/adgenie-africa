/**
 * Public contact details and links live here so the footer, the closing CTA and
 * the legal pages cannot drift apart. The WhatsApp number is stored the way
 * wa.me wants it: country code first, digits only, no leading zero.
 */
export const site = {
  name: "AdGenie Africa",
  shortName: "AdGenie",
  tagline: "AI marketing, built in Accra.",
  url: process.env["NEXT_PUBLIC_APP_URL"] ?? "https://adgenie.africa",
  email: process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ?? "d4.mcom@gmail.com",
  whatsapp: process.env["NEXT_PUBLIC_WHATSAPP_NUMBER"] ?? "233593998216",
  location: "Accra, Ghana",
} as const;

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${site.whatsapp.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function mailLink(subject?: string): string {
  return subject ? `mailto:${site.email}?subject=${encodeURIComponent(subject)}` : `mailto:${site.email}`;
}

export const legalPages = [
  { href: "/privacy", label: "Privacy", title: "Privacy policy" },
  { href: "/terms", label: "Terms", title: "Terms of service" },
  { href: "/safety", label: "Safety", title: "Safety & consent" },
] as const;
