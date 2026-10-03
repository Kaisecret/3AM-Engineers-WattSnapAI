import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Maria S.",
    role: "Homeowner in San Jose",
    initial: "M",
    bg: "#e0f2fe",
    color: "#0284c7",
    review: "WattSnap helped me understand my bill. Now I know where my money goes each month!",
    rating: 5,
  },
  {
    name: "John R.",
    role: "Family Household",
    initial: "J",
    bg: "#fef3c7",
    color: "#d97706",
    review: "The energy tips are super helpful. Our bill is lower compared to last month!",
    rating: 5,
  },
  {
    name: "Anna L.",
    role: "Apartment Resident",
    initial: "A",
    bg: "#ecfdf5",
    color: "#059669",
    review: "I love the clean and simple design. It's very easy to use and prepare for brownouts!",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="about" className="section-wrapper" style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}>
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header-center">
          <h2 className="section-title">
            What Users Are{" "}
            <span className="gradient-text-blue" style={{ position: "relative" }}>
              Saying
              <span style={{
                position: "absolute",
                top: "-12px",
                right: "-24px",
                color: "#f59e0b",
                fontSize: "1.25rem"
              }}>
                ✨
              </span>
            </span>
          </h2>
          <p className="section-subtitle">
            Real feedback from households making the shift to smarter energy habits.
          </p>
        </div>

        {/* 3 Testimonials Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem"
        }} className="testimonials-grid">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="glass-card"
              style={{
                padding: "2rem",
                borderRadius: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative"
              }}
            >
              {/* Quote Icon Background */}
              <div style={{
                position: "absolute",
                top: "1.5rem",
                right: "1.5rem",
                color: "#e2e8f0"
              }}>
                <Quote size={32} />
              </div>

              <div>
                {/* 5 Stars */}
                <div style={{ display: "flex", gap: "3px", color: "#f59e0b", marginBottom: "1.25rem" }}>
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>

                {/* Review Text */}
                <p style={{
                  fontSize: "1rem",
                  color: "#334155",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  marginBottom: "1.75rem"
                }}>
                  &ldquo;{item.review}&rdquo;
                </p>
              </div>

              {/* User Profile */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: item.bg,
                  color: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.1rem"
                }}>
                  {item.initial}
                </div>
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                    {item.name}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
