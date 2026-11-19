import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { VerticalsSection } from "@/components/landing/verticals-section";
import { LanguagesSection } from "@/components/landing/languages-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <main className="relative overflow-x-clip bg-[#060810]">
      {/* Ambient background orbs for the sections below the hero */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="orb orb-gold w-[800px] h-[800px] -top-64 -left-64 opacity-60" />
        <div className="orb orb-purple w-[600px] h-[600px] top-1/2 -right-32 opacity-50" />
        <div className="orb orb-teal w-[500px] h-[500px] bottom-0 left-1/3 opacity-40" />
      </div>

      <div className="relative z-10">
        <LandingNav />
        <HeroSection />
        <HowItWorks />
        <ShowcaseSection />
        <VerticalsSection />
        <LanguagesSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
        <LandingFooter />
      </div>
    </main>
  );
}
