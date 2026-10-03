import { Navbar } from "@/features/landing/components/Navbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { SpotlightSection } from "@/features/landing/components/SpotlightSection";
import { TestimonialsSection } from "@/features/landing/components/TestimonialsSection";
import { AccountCtaBanner } from "@/features/landing/components/AccountCtaBanner";
import { Footer } from "@/features/landing/components/Footer";
import "@/features/landing/post-hero.css";
import "@/features/landing/mobile-landing.css";
import "@/features/landing/footer.css";

export default function LandingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Sticky Navigation Header */}
      <Navbar />

      {/* Main Landing Sections */}
      <main style={{ flex: 1 }}>
        <HeroSection />
        <div className="post-hero">
          <FeaturesSection />
          <HowItWorksSection />
          <SpotlightSection />
          <TestimonialsSection />
          <AccountCtaBanner />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
