import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

const points = [
  "Your campaigns, brand kit and saved assets are exactly where you left them.",
  "Top up with mobile money — credits never expire.",
  "Failed generations refund themselves, automatically.",
];

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      heading={["Pick up", "where you left off."]}
      sub="Sign in to run a new brief, review what the agent planned, or download the files you generated."
      points={points}
    >
      <SignInForm />
    </AuthShell>
  );
}
