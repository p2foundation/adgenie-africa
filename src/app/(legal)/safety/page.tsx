import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { safety } from "@/content/legal";

export const metadata: Metadata = {
  title: "Safety & consent",
  description:
    "How AdGenie handles likeness and consent, why no child is ever a model, what we refuse to generate, and how claims stay honest.",
  alternates: { canonical: "/safety" },
};

export default function SafetyPage() {
  return <LegalPage doc={safety} />;
}
