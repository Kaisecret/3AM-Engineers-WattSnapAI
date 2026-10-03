import Image from "next/image";
import {
  Camera,
  Refrigerator,
  Lightbulb,
  Megaphone,
  MapPin,
  BarChart3,
  Home,
  Receipt,
  MoreHorizontal,
  Bell,
  Wifi,
  Battery,
  ChevronRight,
  TrendingDown,
  AlertTriangle
} from "lucide-react";

interface PhoneMockupProps {
  showFloatingBadges?: boolean;
}

export function PhoneMockup({ showFloatingBadges = true }: PhoneMockupProps) {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "340px", margin: "0 auto" }}>
      {/* Ambient Phone Backglow */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "90%",
        height: "80%",
        background: "radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(251, 191, 36, 0.2) 60%, transparent 80%)",
        filter: "blur(40px)",
        zIndex: 0,
        borderRadius: "50%"
      }} />

      {/* Floating Callout Badges (Desktop/Hero mode) */}
      {showFloatingBadges && (
        <>
          {/* Badge: Track Your Consumption (Left) */}
          <div
            className="glass-card animate-float"
            style={{
              position: "absolute",
              left: "-120px",
              bottom: "160px",
              zIndex: 20,
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 12px 28px -6px rgba(16, 185, 129, 0.25)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              maxWidth: "200px"
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-green-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-green)",
              flexShrink: 0
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "2px" }}>
                Track Consumption <ChevronRight size={12} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                See usage trends & take control
              </div>
            </div>
          </div>

          {/* Badge: Scan Your Bill (Top Right) */}
          <div
            className="glass-card animate-float-delayed"
            style={{
              position: "absolute",
              right: "-125px",
              top: "90px",
              zIndex: 20,
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 12px 28px -6px rgba(2, 132, 199, 0.25)",
              border: "1px solid rgba(2, 132, 199, 0.3)",
              maxWidth: "205px"
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "var(--primary-blue-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-blue)",
              flexShrink: 0
            }}>
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "2px" }}>
                Scan Your Bill <ChevronRight size={12} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                Take a photo & get instant insights
              </div>
            </div>
          </div>

          {/* Badge: Get Energy Tips (Mid Right) */}
          <div
            className="glass-card animate-float"
            style={{
              position: "absolute",
              right: "-120px",
              top: "230px",
              zIndex: 20,
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 12px 28px -6px rgba(245, 158, 11, 0.25)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              maxWidth: "205px"
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-yellow-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-amber)",
              flexShrink: 0
            }}>
              <Lightbulb size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "2px" }}>
                Get Energy Tips <ChevronRight size={12} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                Simple ways to save money
              </div>
            </div>
          </div>

          {/* Badge: Provider Advisories (Bottom Right) */}
          <div
            className="glass-card animate-float-delayed"
            style={{
              position: "absolute",
              right: "-130px",
              bottom: "90px",
              zIndex: 20,
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 12px 28px -6px rgba(239, 68, 68, 0.25)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              maxWidth: "215px"
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              flexShrink: 0
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "2px" }}>
                Provider Advisories <ChevronRight size={12} color="#ef4444" />
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                Stay updated on brownouts & outages
              </div>
            </div>
          </div>
        </>
      )}

      {/* Phone Body Hardware Container */}
      <div style={{
        position: "relative",
        zIndex: 10,
        backgroundColor: "#1e293b",
        borderRadius: "44px",
        padding: "10px",
        boxShadow: "0 25px 60px -15px rgba(2, 132, 199, 0.35), 0 0 0 1px #334155, 0 10px 20px -5px rgba(0, 0, 0, 0.4)",
        transform: "rotate(-1deg)",
        transition: "transform 0.4s ease"
      }}>
        {/* Screen Display Glass */}
        <div style={{
          backgroundColor: "#f8fafc",
          borderRadius: "36px",
          overflow: "hidden",
          border: "2px solid #0f172a",
          display: "flex",
          flexDirection: "column",
          minHeight: "580px",
          color: "var(--text-primary)",
          fontSize: "12px",
          position: "relative"
        }}>
          {/* Dynamic Island / Top Speaker Bar */}
          <div style={{
            height: "28px",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#0f172a"
          }}>
            <span>9:41</span>
            {/* Dynamic Island notch pill */}
            <div style={{
              width: "78px",
              height: "18px",
              backgroundColor: "#0f172a",
              borderRadius: "9999px"
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Wifi size={12} />
              <Battery size={13} />
            </div>
          </div>

          {/* App Header Inside Phone */}
          <div style={{
            padding: "10px 16px 8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Image
                src="/assets/branding/wattsnap-logo.png"
                alt="WattSnap"
                width={85}
                height={26}
                style={{ objectFit: "contain", height: "auto" }}
              />
            </div>
            <div style={{
              position: "relative",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              color: "#64748b"
            }}>
              <Bell size={14} />
              <span style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#ef4444"
              }} />
            </div>
          </div>

          {/* Greeting Banner */}
          <div style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                Good morning, Maria! 👋
              </div>
              <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                Let&apos;s make your home more energy efficient today!
              </div>
            </div>
            {/* Mascot in Phone */}
            <div style={{ flexShrink: 0 }}>
              <Image
                src="/assets/branding/wattsnap-mascot.png"
                alt="WattSnap Mascot"
                width={46}
                height={46}
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>

          {/* Monthly Bill Card */}
          <div style={{
            margin: "8px 14px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.08)",
            border: "1px solid #e0f2fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7"
              }}>
                <Receipt size={22} />
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>This Month&apos;s Bill</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>₱ 2,480.00</div>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  color: "#16a34a",
                  marginTop: "2px"
                }}>
                  <TrendingDown size={11} /> -8% vs last month
                </div>
              </div>
            </div>

            {/* Visual mini bar graph */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "4px",
              height: "36px",
              padding: "4px"
            }}>
              <div style={{ width: "6px", height: "18px", backgroundColor: "#bae6fd", borderRadius: "3px" }} />
              <div style={{ width: "6px", height: "26px", backgroundColor: "#7dd3fc", borderRadius: "3px" }} />
              <div style={{ width: "6px", height: "34px", backgroundColor: "#38bdf8", borderRadius: "3px" }} />
              <div style={{ width: "6px", height: "22px", backgroundColor: "#0284c7", borderRadius: "3px" }} />
            </div>
          </div>

          {/* Quick Actions Grid (6 cards) */}
          <div style={{
            margin: "4px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px"
          }}>
            {/* Scan Bill */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7",
                marginBottom: "6px"
              }}>
                <Camera size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Scan Bill</span>
            </div>

            {/* My Appliances */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                marginBottom: "6px"
              }}>
                <Refrigerator size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Appliances</span>
            </div>

            {/* Energy Tips */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                marginBottom: "6px"
              }}>
                <Lightbulb size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Energy Tips</span>
            </div>

            {/* Provider Advisories */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                marginBottom: "6px"
              }}>
                <Megaphone size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Advisories</span>
            </div>

            {/* Location & Provider */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#e0e7ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4f46e5",
                marginBottom: "6px"
              }}>
                <MapPin size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Location</span>
            </div>

            {/* Bill History */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              border: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "#ccfbf1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f766e",
                marginBottom: "6px"
              }}>
                <BarChart3 size={16} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", lineHeight: 1.1 }}>Bill History</span>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bottom App Navigation inside Phone */}
          <div style={{
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "8px 16px 12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#10b981" }}>
              <Home size={16} />
              <span style={{ fontSize: "9px", fontWeight: 700 }}>Home</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#94a3b8" }}>
              <Receipt size={16} />
              <span style={{ fontSize: "9px", fontWeight: 600 }}>Bills</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#94a3b8" }}>
              <Refrigerator size={16} />
              <span style={{ fontSize: "9px", fontWeight: 600 }}>Appliances</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#94a3b8" }}>
              <Lightbulb size={16} />
              <span style={{ fontSize: "9px", fontWeight: 600 }}>Tips</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#94a3b8" }}>
              <MoreHorizontal size={16} />
              <span style={{ fontSize: "9px", fontWeight: 600 }}>More</span>
            </div>
          </div>

          {/* Home indicator bar */}
          <div style={{
            height: "12px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "4px"
          }}>
            <div style={{ width: "80px", height: "3.5px", backgroundColor: "#cbd5e1", borderRadius: "9999px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
