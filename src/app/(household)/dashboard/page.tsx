import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home, Zap, BarChart3, Bell, Settings } from "lucide-react";

export default function HouseholdDashboardPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-sans, system-ui)" }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#0284c7",
              backgroundColor: "#f0f9ff",
              textDecoration: "none"
            }}
          >
            <ArrowLeft size={16} /> Back to Landing Page
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image
              src="/assets/branding/wattsnap-logo.png"
              alt="WattSnap Logo"
              width={130}
              height={40}
              style={{ objectFit: "contain", height: "auto" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Household: <strong>Maria's Home</strong> (ANTECO)</span>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}>
            M
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          marginBottom: "2rem"
        }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
            Household Dashboard
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Welcome to your household energy portal. Manage bills, appliances, and advisories in one place.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                <Zap size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Current Month Estimate</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>₱ 2,480.00</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>↓ 8% lower than last billing period</p>
          </div>

          <div style={{
            backgroundColor: "#ffffff",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                <BarChart3 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Monthly Consumption</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>185 kWh</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>On track for monthly budget of 200 kWh</p>
          </div>

          <div style={{
            backgroundColor: "#ffffff",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                <Bell size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Provider Status</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Normal Operation</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>ANTECO: No maintenance scheduled today</p>
          </div>
        </div>
      </main>
    </div>
  );
}
