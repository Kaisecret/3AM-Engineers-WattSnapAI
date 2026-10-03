import Image from "next/image";
import Link from "next/link";
import { Zap, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer style={{
      backgroundColor: "#ffffff",
      borderTop: "1px solid #e2e8f0",
      padding: "4rem 0 2.5rem 0",
      color: "#64748b"
    }}>
      <div className="landing-container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
          gap: "3rem",
          marginBottom: "3.5rem"
        }} className="footer-grid">
          {/* Brand Info */}
          <div>
            <Link href="/" style={{ display: "inline-block", marginBottom: "1rem" }}>
              <Image
                src="/assets/branding/wattsnap-logo.png"
                alt="WattSnap Logo"
                width={150}
                height={46}
                style={{ objectFit: "contain", height: "auto" }}
              />
            </Link>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#64748b", maxWidth: "300px" }}>
              Your smart home electricity assistant. Scan power bills, analyze consumption habits, and be ready for brownouts.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
              Product
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <li>
                <Link href="#features" style={{ color: "#64748b", transition: "color 0.2s" }}>Features</Link>
              </li>
              <li>
                <Link href="#how-it-works" style={{ color: "#64748b", transition: "color 0.2s" }}>How It Works</Link>
              </li>
              <li>
                <Link href="#download" style={{ color: "#64748b", transition: "color 0.2s" }}>Download App</Link>
              </li>
              <li>
                <Link href="/dashboard" style={{ color: "var(--primary-blue)", fontWeight: 600 }}>Household Dashboard</Link>
              </li>
            </ul>
          </div>

          {/* Capabilities */}
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
              Capabilities
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <li>Bill Scanner AI</li>
              <li>Watt-If Simulator</li>
              <li>Tipid Tips & Budget</li>
              <li>Brownout Ready Mode</li>
            </ul>
          </div>

          {/* Coverage & Utilities */}
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
              Coverage
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <li>Antique (ANTECO)</li>
              <li>Panay Utilities</li>
              <li>Offline-First Access</li>
              <li>Local SQLite Storage</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div style={{
          borderTop: "1px solid #f1f5f9",
          paddingTop: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          fontSize: "0.85rem"
        }}>
          <div>
            <p style={{ color: "#94a3b8", lineHeight: 1.5, maxWidth: "600px" }}>
              WattSnap AI is an independent consumer electricity assistant. Initial validation focuses on ANTECO billing structures. Not affiliated with distribution electric utilities.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b" }}>
            <span>© 2026 WattSnap AI. Built for brighter homes.</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
