import type { Metadata } from "next";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import { Navbar } from "@/features/landing/components/Navbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { SpotlightSection } from "@/features/landing/components/SpotlightSection";
import { TestimonialsSection } from "@/features/landing/components/TestimonialsSection";
import { AccountCtaBanner } from "@/features/landing/components/AccountCtaBanner";
import { Footer } from "@/features/landing/components/Footer";
import { LandingChatWidget } from "@/features/assistant/components/LandingChatWidget";
import "@/features/landing/post-hero.css";
import "@/features/landing/mobile-landing.css";
import "@/features/landing/footer.css";
import "@/features/assistant/assistant.css";

const socialImage = { url: "/assets/branding/wattsnap-social-preview.jpg", width: 1200, height: 630, alt: "WattSnap robot and home electricity app preview" };

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "en_PH", url: "/", siteName: "WattSnap AI", title: siteTitle, description: siteDescription, images: [socialImage] },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: [socialImage] },
};

const website = { "@context": "https://schema.org", "@type": "WebSite", name: "WattSnap AI", alternateName: "WattSnap", url: `${siteUrl}/`, description: siteDescription, inLanguage: "en" };

export default function LandingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
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

      {/* Floating WattSnap AI chat */}
      <LandingChatWidget />
    </div>
  );
}
