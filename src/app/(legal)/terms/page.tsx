import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { terms } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The agreement between you and AdGenie Africa: accounts, credits, payments, your content, acceptable use and the limits on both sides.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage doc={terms} />;
}
