import {
  ScanLine,
  FileSearch,
  BarChart3,
  Lightbulb,
  ArrowRight
} from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Scan Your Bill",
    desc: "Take a photo of your electricity bill.",
    icon: ScanLine,
    color: "#0284c7",
    bg: "#e0f2fe",
  },
  {
    step: 2,
    title: "AI Analysis",
    desc: "Our AI reads and analyzes the details instantly.",
    icon: FileSearch,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  {
    step: 3,
    title: "View Insights",
    desc: "See your consumption, bill breakdown, and trends.",
    icon: BarChart3,
    color: "#f59e0b",
    bg: "#fef3c7",
  },
  {
    step: 4,
    title: "Take Action",
    desc: "Get tips and be ready for advisories to save energy and money.",
    icon: Lightbulb,
    color: "#8b5cf6",
    bg: "#f3e8ff",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-wrapper">
      <div className="landing-container">
        {/* Section Title */}
        <div className="section-header-center">
          <h2 className="section-title">
            How <span className="gradient-text-blue">WattSnap</span>{" "}
            <span className="gradient-text-orange" style={{ position: "relative" }}>
              Works
              <span style={{
                position: "absolute",
                top: "-10px",
                right: "-20px",
                color: "#f59e0b",
                fontSize: "1.25rem"
              }}>
                ⚡
              </span>
            </span>
          </h2>
          <p className="section-subtitle">
            A simple 4-step journey to smarter electricity management for your household.
          </p>
        </div>

        {/* 4 Steps Row with Connecting Arrows */}
        <div style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: "1rem",
          position: "relative"
        }} className="steps-container">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={item.step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1
                }}
                className="step-wrapper"
              >
                {/* Step Card */}
                <div
                  className="glass-card"
                  style={{
                    flex: 1,
                    padding: "2rem 1.5rem",
                    borderRadius: "1.5rem",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative"
                  }}
                >
                  {/* Number Badge at Top */}
                  <div style={{
                    position: "absolute",
                    top: "-16px",
                    left: "20px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    boxShadow: `0 4px 10px ${item.color}40`
                  }}>
                    {item.step}
                  </div>

                  {/* Icon Container */}
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "18px",
                    backgroundColor: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    marginBottom: "1.25rem",
                    marginTop: "0.5rem"
                  }}>
                    <Icon size={32} />
                  </div>

                  {/* Step Title */}
                  <h3 style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "0.5rem"
                  }}>
                    {item.title}
                  </h3>

                  {/* Step Description */}
                  <p style={{
                    fontSize: "0.875rem",
                    color: "#64748b",
                    lineHeight: 1.45
                  }}>
                    {item.desc}
                  </p>
                </div>

                {/* Connecting Arrow (Desktop) */}
                {!isLast && (
                  <div
                    className="step-arrow"
                    style={{
                      padding: "0 0.5rem",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <ArrowRight size={24} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
