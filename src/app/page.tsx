import { Navbar } from "@/features/landing/components/Navbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { SpotlightSection } from "@/features/landing/components/SpotlightSection";
import { TestimonialsSection } from "@/features/landing/components/TestimonialsSection";
import { DownloadCtaBanner } from "@/features/landing/components/DownloadCtaBanner";
import { Footer } from "@/features/landing/components/Footer";

export default function LandingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Sticky Navigation Header */}
      <Navbar />

      {/* Main Landing Sections */}
      <main style={{ flex: 1 }}>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SpotlightSection />
        <TestimonialsSection />
        <DownloadCtaBanner />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
