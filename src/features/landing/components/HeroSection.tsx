import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Play,
  Home,
  BarChart2,
  Lightbulb,
  Sparkles,
  Bot
} from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";

export function HeroSection() {
  return (
    <section style={{
      position: "relative",
      paddingTop: "3.5rem",
      paddingBottom: "5rem",
      overflow: "hidden"
    }}>
      {/* Background Soft Glow Accents */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "10%",
        width: "550px",
        height: "550px",
        background: "radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(253, 224, 71, 0.12) 50%, transparent 70%)",
        filter: "blur(70px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div className="landing-container" style={{ position: "relative", zIndex: 1 }}>
        {/* Main 2-Column Hero Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          alignItems: "center",
          gap: "3rem",
          marginBottom: "4.5rem"
        }} className="hero-grid">
          {/* Left Column: Headlines & CTAs */}
          <div>
            {/* Pill Tag */}
            <div className="badge-pill" style={{ marginBottom: "1.5rem" }}>
              <Home size={16} />
              <span>Smart Energy. Brighter Homes.</span>
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontSize: "clamp(2.75rem, 5vw, 4.25rem)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#0f172a",
              marginBottom: "1.25rem"
            }}>
              Your Home <br />
              <span className="gradient-text-blue">Electricity</span> <br />
              <span className="gradient-text-orange" style={{ position: "relative", display: "inline-block" }}>
                Assistant
                {/* Sparkle doodle decor */}
                <span style={{
                  position: "absolute",
                  right: "-26px",
                  top: "0px",
                  color: "#f59e0b",
                  fontSize: "1.25rem",
                  transform: "rotate(15deg)"
                }}>
                  ✨
                </span>
              </span>
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: "clamp(1.1rem, 2vw, 1.35rem)",
              color: "#475569",
              lineHeight: 1.5,
              fontWeight: 500,
              maxWidth: "500px",
              marginBottom: "2rem"
            }}>
              Understand your bills. Save energy. <br />
              Be ready for brownouts.
            </p>

            {/* Primary Action Buttons */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1.125rem",
              flexWrap: "wrap",
              marginBottom: "2rem"
            }}>
              <Link href="#download" className="btn-primary" style={{ padding: "0.95rem 2rem", fontSize: "1.05rem" }}>
                <Download size={20} /> Download for Free
              </Link>

              <a
                href="#features"
                className="btn-secondary"
                style={{ padding: "0.9rem 1.75rem", fontSize: "1.05rem" }}
              >
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-blue-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary-blue)"
                }}>
                  <Play size={12} fill="currentColor" />
                </div>
                Watch Video
              </a>
            </div>

            {/* Quick App Store Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Available on:</span>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#1e293b"
              }}>
                <span>Android & iOS</span>
              </div>
            </div>
          </div>

          {/* Right Column: Mascot + Interactive Phone */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {/* Flying Mascot Bee with Speech Bubble */}
            <div
              className="animate-float"
              style={{
                position: "absolute",
                top: "-50px",
                left: "-50px",
                zIndex: 15,
                pointerEvents: "none"
              }}
            >
              {/* Mascot Speech Bubble */}
              <div style={{
                position: "absolute",
                top: "-15px",
                right: "-65px",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "0.75rem",
                padding: "0.4rem 0.8rem",
                borderRadius: "1rem",
                boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                Scan Analyze Save! ⚡
              </div>

              {/* High-res Mascot Image */}
              <Image
                src="/assets/branding/wattsnap-mascot.png"
                alt="WattSnap Mascot"
                width={200}
                height={200}
                priority
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 15px 30px rgba(2, 132, 199, 0.35))"
                }}
              />
            </div>

            {/* Phone Mockup with floating badges */}
            <PhoneMockup showFloatingBadges={true} />
          </div>
        </div>

        {/* 4 Bottom Highlight Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.25rem"
        }} className="hero-highlights">
          {/* Card 1 */}
          <div className="glass-card" style={{ padding: "1.5rem 1.25rem", borderRadius: "1.25rem" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "var(--accent-green-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-green-dark)",
              marginBottom: "1rem"
            }}>
              <Home size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
              Understand Your Bills
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.45 }}>
              Easy and clear explanations for every fee and rate breakdown.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card" style={{ padding: "1.5rem 1.25rem", borderRadius: "1.25rem" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "var(--primary-blue-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-blue)",
              marginBottom: "1rem"
            }}>
              <BarChart2 size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
              Monitor Usage
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.45 }}>
              Track your electricity consumption in real time with intuitive charts.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card" style={{ padding: "1.5rem 1.25rem", borderRadius: "1.25rem" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "var(--accent-yellow-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-amber)",
              marginBottom: "1rem"
            }}>
              <Lightbulb size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
              Save Energy Save Money
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.45 }}>
              Get practical, personalized tips for a more energy-efficient home.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-card" style={{ padding: "1.5rem 1.25rem", borderRadius: "1.25rem" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
              marginBottom: "1rem"
            }}>
              <Bot size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
              Helpful AI Guidance
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.45 }}>
              Ask questions and get instant, tailored energy answers from Gemini AI.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
