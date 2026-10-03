import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, Leaf, Wind, Zap } from "lucide-react";

export function SpotlightSection() {
  return (
    <section className="section-wrapper" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="landing-container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem"
        }} className="spotlight-grid">
          {/* Card 1: Outage Readiness */}
          <div
            className="glass-card"
            style={{
              padding: "2.5rem 2rem",
              borderRadius: "1.75rem",
              background: "linear-gradient(135deg, #e0f2fe 0%, #ffffff 60%, #bae6fd 100%)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Ambient Background Graphic */}
            <div style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              opacity: 0.15,
              pointerEvents: "none",
              color: "#0284c7"
            }}>
              <Zap size={180} />
            </div>

            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
                color: "#0284c7",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1.25rem"
              }}>
                <Bell size={16} /> Outage Intelligence
              </div>

              <h3 style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.25,
                marginBottom: "1rem"
              }}>
                Be Ready for <br />
                <span className="gradient-text-blue">What&apos;s Next</span> ⚡
              </h3>

              <p style={{
                fontSize: "1rem",
                color: "#475569",
                lineHeight: 1.6,
                maxWidth: "380px",
                marginBottom: "2rem"
              }}>
                Get real-time updates on power advisories, maintenance schedules, and unexpected brownouts in your area.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.975rem",
                  fontWeight: 700,
                  color: "#0284c7"
                }}
              >
                Learn More <ArrowRight size={18} />
              </Link>

              {/* Mini Mascot Thumbs Up */}
              <div style={{ width: "70px", height: "70px", position: "relative" }}>
                <Image
                  src="/assets/branding/wattsnap-mascot.png"
                  alt="Mascot Alert"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Sustainability & Green Habits */}
          <div
            className="glass-card"
            style={{
              padding: "2.5rem 2rem",
              borderRadius: "1.75rem",
              background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 60%, #a7f3d0 100%)",
              border: "1px solid rgba(167, 243, 208, 0.8)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Ambient Background Graphic */}
            <div style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              opacity: 0.15,
              pointerEvents: "none",
              color: "#10b981"
            }}>
              <Wind size={180} />
            </div>

            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)",
                color: "#059669",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1.25rem"
              }}>
                <Leaf size={16} /> Sustainable Energy
              </div>

              <h3 style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.25,
                marginBottom: "1rem"
              }}>
                Smarter Homes <br />
                <span className="gradient-text-green">Brighter Tomorrows</span> 🍃
              </h3>

              <p style={{
                fontSize: "1rem",
                color: "#475569",
                lineHeight: 1.6,
                maxWidth: "380px",
                marginBottom: "2rem"
              }}>
                Small habits make a big difference. WattSnap helps you build smarter energy routines for a greener, sustainable future.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link
                href="#about"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.975rem",
                  fontWeight: 700,
                  color: "#059669"
                }}
              >
                Our Mission <ArrowRight size={18} />
              </Link>

              {/* Eco Earth / Leaf decor */}
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
              }}>
                <Leaf size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
