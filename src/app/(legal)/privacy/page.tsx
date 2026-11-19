import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacy } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What AdGenie Africa collects, why we need it, who can see it, and how to get a copy of your data or have it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return <LegalPage doc={privacy} />;
}
