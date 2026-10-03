import Image from "next/image";
import { Download } from "lucide-react";

export function DownloadCtaBanner() {
  return (
    <section id="download" className="section-wrapper" style={{ paddingTop: "3rem", paddingBottom: "5rem" }}>
      <div className="landing-container">
        <div style={{
          position: "relative",
          background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)",
          borderRadius: "2.25rem",
          padding: "4rem 3.5rem",
          color: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(2, 132, 199, 0.45)"
        }} className="cta-banner">
          {/* Cloud Decor Backdrops */}
          <div style={{
            position: "absolute",
            bottom: "-30px",
            left: "-20px",
            width: "300px",
            height: "150px",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: "50%",
            filter: "blur(20px)",
            pointerEvents: "none"
          }} />
          <div style={{
            position: "absolute",
            top: "-40px",
            right: "30%",
            width: "250px",
            height: "150px",
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "50%",
            filter: "blur(25px)",
            pointerEvents: "none"
          }} />

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            alignItems: "center",
            gap: "2.5rem",
            position: "relative",
            zIndex: 1
          }} className="cta-grid">
            {/* Left Content */}
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.9rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1.25rem"
              }}>
                <Download size={15} /> Free Mobile App
              </div>

              <h2 style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: "1rem"
              }}>
                Download <br />
                <span style={{ color: "#fef08a" }}>WattSnap Now</span> ✨
              </h2>

              <p style={{
                fontSize: "1.1rem",
                color: "rgba(255, 255, 255, 0.92)",
                lineHeight: 1.6,
                maxWidth: "480px",
                marginBottom: "2.25rem"
              }}>
                Manage your electricity, save money, and build a brighter, more resilient home today.
              </p>

              {/* App Store Buttons */}
              <div className="store-badges">
                {/* Google Play */}
                <a
                  href="#download"
                  className="btn-store"
                  style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.793 12 3.61 22.186a2.03 2.03 0 0 1-.22-.964V2.778c0-.36.08-.693.22-.964zm11.24 11.24l2.586-2.586-12.78-7.38 10.194 9.966zm0 1.892l-10.194 9.966 12.78-7.38-2.586-2.586zm1.414-1.414l3.197 1.846c.866.5 1.414 1.45 1.414 2.45s-.548 1.95-1.414 2.45l-3.197 1.846-3.197-3.196 3.197-3.196z"/>
                  </svg>
                  <div className="btn-store-text">
                    <span className="btn-store-sub">GET IT ON</span>
                    <span className="btn-store-title">Google Play</span>
                  </div>
                </a>

                {/* Apple App Store */}
                <a
                  href="#download"
                  className="btn-store"
                  style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.63 1.34-.56.65-.96 1.7-0.84 2.73.99.08 1.96-.51 2.55-1.22z"/>
                  </svg>
                  <div className="btn-store-text">
                    <span className="btn-store-sub">Download on the</span>
                    <span className="btn-store-title">App Store</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Graphic: Mascot Holding Phone */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative"
            }}>
              <div
                className="animate-float"
                style={{
                  position: "relative",
                  width: "280px",
                  height: "280px"
                }}
              >
                <Image
                  src="/assets/branding/wattsnap-mascot.png"
                  alt="WattSnap Mascot Download"
                  fill
                  style={{
                    objectFit: "contain",
                    filter: "drop-shadow(0 20px 30px rgba(0, 0, 0, 0.25))"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
