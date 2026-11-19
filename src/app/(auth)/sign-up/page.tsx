import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Sign up free" };

const points = [
  "10 free credits land in your account once you confirm your email.",
  "Every plan shows its full price before anything is generated.",
  "A generation that fails refunds itself — you never chase a credit.",
  "Twi and Ga copy passes a native-speaker review before you can post it.",
];

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Free to start"
      heading={["Sign up in 30 seconds.", "Sell in five minutes."]}
      sub="No card, no trial countdown, no demo call. Give AdGenie a product photo or a link and it plans the campaign, prices it, and writes it."
      points={points}
    >
      <SignUpForm />
    </AuthShell>
  );
}
