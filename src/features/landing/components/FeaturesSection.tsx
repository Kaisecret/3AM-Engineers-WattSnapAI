import {
  FileText,
  BarChart3,
  Lightbulb,
  BellRing,
  ChevronRight
} from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";

const features = [
  {
    id: "scan",
    title: "Scan Your Electricity Bill",
    description: "Take a clear photo and let AI extract the important details for you.",
    icon: FileText,
    iconColor: "#0284c7",
    iconBg: "#e0f2fe",
  },
  {
    id: "track",
    title: "Track Your Consumption",
    description: "View daily, weekly, and monthly usage in easy-to-read charts.",
    icon: BarChart3,
    iconColor: "#10b981",
    iconBg: "#ecfdf5",
  },
  {
    id: "tips",
    title: "Get Energy-Saving Tips",
    description: "Receive personalized recommendations to help you save.",
    icon: Lightbulb,
    iconColor: "#f59e0b",
    iconBg: "#fef3c7",
  },
  {
    id: "updates",
    title: "Stay Updated",
    description: "Get real-time advisories and announcements from your electricity provider.",
    icon: BellRing,
    iconColor: "#ef4444",
    iconBg: "#fee2e2",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-wrapper" style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}>
      <div className="landing-container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          alignItems: "center",
          gap: "4rem"
        }} className="features-grid">
          {/* Left Column: Phone Mockup */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PhoneMockup showFloatingBadges={false} />
          </div>

          {/* Right Column: Features List */}
          <div>
            <h2 className="section-title" style={{ textAlign: "left", marginBottom: "0.75rem" }}>
              Smart Features <br />
              for a <span className="gradient-text-orange">Brighter Home</span>
            </h2>
            <p style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              marginBottom: "2.5rem",
              lineHeight: 1.6
            }}>
              Everything you need to manage your electricity usage — all in one app.
            </p>

            {/* Stack of 4 Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="glass-card feature-card-interactive"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                      <div style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "14px",
                        backgroundColor: item.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.iconColor,
                        flexShrink: 0
                      }}>
                        <Icon size={26} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                          {item.title}
                        </h3>
                        <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      color: item.iconColor,
                      padding: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
